#include "aik_doom_abi.h"

#include "deh_str.h"
#include "doomtype.h"
#include "i_sound.h"
#include "w_wad.h"
#include "z_zone.h"

#include <stdint.h>
#include <stdio.h>

#define AIK_DOOM_AUDIO_SAMPLE_RATE 44100
#define AIK_DOOM_AUDIO_CHANNELS 2
#define AIK_DOOM_AUDIO_CAPACITY_FRAMES 65536
#define AIK_DOOM_AUDIO_MAX_SOUND_FRAMES 44100
#define AIK_DOOM_AUDIO_OUTPUT_GAIN_NUM 3
#define AIK_DOOM_AUDIO_OUTPUT_GAIN_DEN 2

static int16_t g_audio_buffer[AIK_DOOM_AUDIO_CAPACITY_FRAMES * AIK_DOOM_AUDIO_CHANNELS];
static uint32_t g_audio_read_frame = 0;
static uint32_t g_audio_write_frame = 0;
static uint32_t g_audio_available_frames = 0;
static uint32_t g_audio_event_count = 0;
static int g_audio_initialized = 0;
static int g_use_sfx_prefix = 1;

static snddevice_t g_aikernel_sound_devices[] =
{
    SNDDEVICE_SB,
    SNDDEVICE_PAS,
    SNDDEVICE_GUS,
    SNDDEVICE_WAVEBLASTER,
    SNDDEVICE_SOUNDCANVAS,
    SNDDEVICE_AWE32,
};

int use_libsamplerate = 0;
float libsamplerate_scale = 0.65f;

static void aik_doom_audio_reset(void)
{
    g_audio_read_frame = 0;
    g_audio_write_frame = 0;
    g_audio_available_frames = 0;
    g_audio_event_count = 0;
}

static void aik_doom_audio_write_frame(int16_t left, int16_t right)
{
    uint32_t index = g_audio_write_frame * AIK_DOOM_AUDIO_CHANNELS;
    g_audio_buffer[index] = left;
    g_audio_buffer[index + 1] = right;

    g_audio_write_frame = (g_audio_write_frame + 1) % AIK_DOOM_AUDIO_CAPACITY_FRAMES;

    if (g_audio_available_frames == AIK_DOOM_AUDIO_CAPACITY_FRAMES)
    {
        g_audio_read_frame = (g_audio_read_frame + 1) % AIK_DOOM_AUDIO_CAPACITY_FRAMES;
    }
    else
    {
        ++g_audio_available_frames;
    }
}

static int16_t aik_doom_audio_scale_sample(uint8_t sample, int gain)
{
    int centered = ((int)sample - 128) * 256;
    int scaled;

    if (gain < 0)
    {
        gain = 0;
    }
    else if (gain > 127)
    {
        gain = 127;
    }

    scaled = (centered * gain * AIK_DOOM_AUDIO_OUTPUT_GAIN_NUM) / (127 * AIK_DOOM_AUDIO_OUTPUT_GAIN_DEN);

    if (scaled < -32768)
    {
        return -32768;
    }

    if (scaled > 32767)
    {
        return 32767;
    }

    return (int16_t)scaled;
}

static void aik_doom_audio_name(sfxinfo_t *sfx, char *buffer, size_t buffer_length)
{
    sfxinfo_t *source = sfx;

    if (source != 0 && source->link != 0)
    {
        source = source->link;
    }

    if (source == 0 || buffer_length == 0)
    {
        return;
    }

    if (g_use_sfx_prefix)
    {
        snprintf(buffer, buffer_length, "ds%s", DEH_String(source->name));
    }
    else
    {
        snprintf(buffer, buffer_length, "%s", DEH_String(source->name));
    }
}

static int aik_doom_audio_get_sfx_lump_num(sfxinfo_t *sfx)
{
    char name[9] = { 0 };
    aik_doom_audio_name(sfx, name, sizeof(name));
    return W_GetNumForName(name);
}

static int aik_doom_audio_enqueue_lump(int lumpnum, int volume, int separation)
{
    byte *data;
    unsigned int lump_length;
    unsigned int sample_length;
    unsigned int source_index;
    unsigned int out_frames;
    unsigned int i;
    int sample_rate;
    int left_gain;
    int right_gain;

    if (lumpnum < 0)
    {
        return 0;
    }

    data = (byte *)W_CacheLumpNum(lumpnum, PU_STATIC);
    lump_length = (unsigned int)W_LumpLength((unsigned int)lumpnum);

    if (data == 0 || lump_length < 8 || data[0] != 0x03 || data[1] != 0x00)
    {
        if (data != 0)
        {
            W_ReleaseLumpNum(lumpnum);
        }
        return 0;
    }

    sample_rate = (data[3] << 8) | data[2];
    sample_length = (unsigned int)((data[7] << 24) | (data[6] << 16) | (data[5] << 8) | data[4]);

    if (sample_rate <= 0 || sample_length > lump_length - 8 || sample_length <= 48)
    {
        W_ReleaseLumpNum(lumpnum);
        return 0;
    }

    data += 24;
    sample_length -= 32;
    out_frames = (unsigned int)(((uint64_t)sample_length * AIK_DOOM_AUDIO_SAMPLE_RATE) / (uint32_t)sample_rate);

    if (out_frames > AIK_DOOM_AUDIO_MAX_SOUND_FRAMES)
    {
        out_frames = AIK_DOOM_AUDIO_MAX_SOUND_FRAMES;
    }

    if (volume < 0)
    {
        volume = 0;
    }
    else if (volume > 127)
    {
        volume = 127;
    }

    if (separation < 0)
    {
        separation = 0;
    }
    else if (separation > 254)
    {
        separation = 254;
    }

    left_gain = ((254 - separation) * volume) / 127;
    right_gain = (separation * volume) / 127;

    for (i = 0; i < out_frames; ++i)
    {
        source_index = (unsigned int)(((uint64_t)i * (uint32_t)sample_rate) / AIK_DOOM_AUDIO_SAMPLE_RATE);

        if (source_index >= sample_length)
        {
            break;
        }

        aik_doom_audio_write_frame(
            aik_doom_audio_scale_sample(data[source_index], left_gain),
            aik_doom_audio_scale_sample(data[source_index], right_gain));
    }

    W_ReleaseLumpNum(lumpnum);
    ++g_audio_event_count;
    return 1;
}

static boolean aik_doom_sound_init(boolean use_sfx_prefix)
{
    g_use_sfx_prefix = use_sfx_prefix ? 1 : 0;
    g_audio_initialized = 1;
    aik_doom_audio_reset();
    aik_doom_log("doomgeneric AIKernel sound bridge initialized");
    return true;
}

static void aik_doom_sound_shutdown(void)
{
    g_audio_initialized = 0;
    aik_doom_audio_reset();
}

static void aik_doom_sound_update(void)
{
}

static void aik_doom_sound_update_params(int channel, int volume, int separation)
{
    (void)channel;
    (void)volume;
    (void)separation;
}

static int aik_doom_sound_start(sfxinfo_t *sfx, int channel, int volume, int separation)
{
    int lumpnum;

    if (!g_audio_initialized || sfx == 0)
    {
        return -1;
    }

    lumpnum = sfx->lumpnum;

    if (lumpnum < 0)
    {
        lumpnum = aik_doom_audio_get_sfx_lump_num(sfx);
        sfx->lumpnum = lumpnum;
    }

    if (!aik_doom_audio_enqueue_lump(lumpnum, volume, separation))
    {
        return -1;
    }

    return channel;
}

static void aik_doom_sound_stop(int channel)
{
    (void)channel;
}

static boolean aik_doom_sound_is_playing(int channel)
{
    (void)channel;
    return false;
}

static void aik_doom_sound_cache(sfxinfo_t *sounds, int sound_count)
{
    (void)sounds;
    (void)sound_count;
}

sound_module_t DG_sound_module =
{
    g_aikernel_sound_devices,
    sizeof(g_aikernel_sound_devices) / sizeof(g_aikernel_sound_devices[0]),
    aik_doom_sound_init,
    aik_doom_sound_shutdown,
    aik_doom_audio_get_sfx_lump_num,
    aik_doom_sound_update,
    aik_doom_sound_update_params,
    aik_doom_sound_start,
    aik_doom_sound_stop,
    aik_doom_sound_is_playing,
    aik_doom_sound_cache,
};

static boolean aik_doom_music_init(void)
{
    return true;
}

static void aik_doom_music_shutdown(void)
{
}

static void aik_doom_music_set_volume(int volume)
{
    (void)volume;
}

static void aik_doom_music_pause(void)
{
}

static void aik_doom_music_resume(void)
{
}

static void *aik_doom_music_register(void *data, int length)
{
    (void)data;
    (void)length;
    return 0;
}

static void aik_doom_music_unregister(void *handle)
{
    (void)handle;
}

static void aik_doom_music_play(void *handle, boolean looping)
{
    (void)handle;
    (void)looping;
}

static void aik_doom_music_stop(void)
{
}

static boolean aik_doom_music_is_playing(void)
{
    return false;
}

static void aik_doom_music_poll(void)
{
}

music_module_t DG_music_module =
{
    g_aikernel_sound_devices,
    sizeof(g_aikernel_sound_devices) / sizeof(g_aikernel_sound_devices[0]),
    aik_doom_music_init,
    aik_doom_music_shutdown,
    aik_doom_music_set_volume,
    aik_doom_music_pause,
    aik_doom_music_resume,
    aik_doom_music_register,
    aik_doom_music_unregister,
    aik_doom_music_play,
    aik_doom_music_stop,
    aik_doom_music_is_playing,
    aik_doom_music_poll,
};

int doom_audio_status(void)
{
    return g_audio_initialized;
}

int doom_audio_sample_rate(void)
{
    return AIK_DOOM_AUDIO_SAMPLE_RATE;
}

int doom_audio_channels(void)
{
    return AIK_DOOM_AUDIO_CHANNELS;
}

int16_t *doom_audio_buffer(void)
{
    return g_audio_buffer;
}

uint32_t doom_audio_capacity_frames(void)
{
    return AIK_DOOM_AUDIO_CAPACITY_FRAMES;
}

uint32_t doom_audio_read_offset_frames(void)
{
    return g_audio_read_frame;
}

uint32_t doom_audio_available_frames(void)
{
    return g_audio_available_frames;
}

uint32_t doom_audio_consume_frames(uint32_t frames)
{
    if (frames > g_audio_available_frames)
    {
        frames = g_audio_available_frames;
    }

    g_audio_read_frame = (g_audio_read_frame + frames) % AIK_DOOM_AUDIO_CAPACITY_FRAMES;
    g_audio_available_frames -= frames;

    return frames;
}

uint32_t doom_audio_event_count(void)
{
    return g_audio_event_count;
}
