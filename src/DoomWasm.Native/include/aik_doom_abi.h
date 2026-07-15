#ifndef AIK_DOOM_ABI_H
#define AIK_DOOM_ABI_H

#include <stdint.h>
#include "aik_doom_result.h"

#if defined(__EMSCRIPTEN__)
#include <emscripten/emscripten.h>
#define AIK_DOOM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define AIK_DOOM_EXPORT
#endif

#ifdef __cplusplus
extern "C" {
#endif

AIK_DOOM_EXPORT int doom_init(void);
AIK_DOOM_EXPORT int doom_tick(void);
AIK_DOOM_EXPORT uint8_t *doom_render(void);
AIK_DOOM_EXPORT int doom_input(int keycode, int pressed);
AIK_DOOM_EXPORT int doom_input_action(int move, int turn, int fire, int strafe);
AIK_DOOM_EXPORT int doom_mount_wad(uint8_t *data, uint32_t size);
AIK_DOOM_EXPORT int doom_wad_status(void);
AIK_DOOM_EXPORT int doom_audio_status(void);
AIK_DOOM_EXPORT int doom_audio_sample_rate(void);
AIK_DOOM_EXPORT int doom_audio_channels(void);
AIK_DOOM_EXPORT int16_t *doom_audio_buffer(void);
AIK_DOOM_EXPORT uint32_t doom_audio_capacity_frames(void);
AIK_DOOM_EXPORT uint32_t doom_audio_read_offset_frames(void);
AIK_DOOM_EXPORT uint32_t doom_audio_available_frames(void);
AIK_DOOM_EXPORT uint32_t doom_audio_consume_frames(uint32_t frames);
AIK_DOOM_EXPORT uint32_t doom_audio_event_count(void);
AIK_DOOM_EXPORT uint32_t doom_audio_event_capacity(void);
AIK_DOOM_EXPORT uint32_t doom_audio_event_oldest_sequence(void);
AIK_DOOM_EXPORT int doom_audio_event_available(uint32_t sequence);
AIK_DOOM_EXPORT int32_t doom_audio_event_sfx_id(uint32_t sequence);
AIK_DOOM_EXPORT const uint8_t *doom_audio_event_sfx_name(uint32_t sequence);
AIK_DOOM_EXPORT uint32_t doom_audio_event_sfx_name_length(uint32_t sequence);

AIK_DOOM_EXPORT int doom_run_facts_available(void);
AIK_DOOM_EXPORT int32_t doom_run_gametic(void);
AIK_DOOM_EXPORT int32_t doom_run_leveltime(void);
AIK_DOOM_EXPORT int32_t doom_run_levelstarttic(void);
AIK_DOOM_EXPORT int32_t doom_run_gamestate(void);
AIK_DOOM_EXPORT int32_t doom_run_gameepisode(void);
AIK_DOOM_EXPORT int32_t doom_run_gamemap(void);
AIK_DOOM_EXPORT int doom_run_level_load_sequence_available(void);
AIK_DOOM_EXPORT uint32_t doom_run_level_load_sequence(void);

AIK_DOOM_EXPORT int doom_player_facts_available(void);
AIK_DOOM_EXPORT int32_t doom_player_x_fixed(void);
AIK_DOOM_EXPORT int32_t doom_player_y_fixed(void);
AIK_DOOM_EXPORT uint32_t doom_player_angle_bam(void);
AIK_DOOM_EXPORT int32_t doom_player_momx_fixed(void);
AIK_DOOM_EXPORT int32_t doom_player_momy_fixed(void);
AIK_DOOM_EXPORT int32_t doom_player_sector_index(void);
AIK_DOOM_EXPORT int32_t doom_player_health(void);
AIK_DOOM_EXPORT int32_t doom_player_state(void);
AIK_DOOM_EXPORT int32_t doom_player_kill_count(void);
AIK_DOOM_EXPORT int32_t doom_state_count(void);
AIK_DOOM_EXPORT int doom_player_weapon_facts_available(void);
AIK_DOOM_EXPORT int32_t doom_player_ready_weapon(void);
AIK_DOOM_EXPORT int32_t doom_player_pending_weapon(void);
AIK_DOOM_EXPORT int32_t doom_player_weapon_state(void);
AIK_DOOM_EXPORT int32_t doom_player_weapon_ready_state(void);
AIK_DOOM_EXPORT int32_t doom_player_refire(void);

AIK_DOOM_EXPORT int doom_actor_snapshot_available(void);
AIK_DOOM_EXPORT int32_t doom_actor_snapshot_gametic(void);
AIK_DOOM_EXPORT uint32_t doom_actor_snapshot_count(void);
AIK_DOOM_EXPORT uint32_t doom_actor_snapshot_capacity(void);
AIK_DOOM_EXPORT int doom_actor_snapshot_truncated(void);
AIK_DOOM_EXPORT uint32_t doom_actor_identity(uint32_t index);
AIK_DOOM_EXPORT int32_t doom_actor_x_fixed(uint32_t index);
AIK_DOOM_EXPORT int32_t doom_actor_y_fixed(uint32_t index);
AIK_DOOM_EXPORT int32_t doom_actor_sector_index(uint32_t index);
AIK_DOOM_EXPORT int32_t doom_actor_type(uint32_t index);
AIK_DOOM_EXPORT int32_t doom_actor_health(uint32_t index);
AIK_DOOM_EXPORT uint32_t doom_actor_flags(uint32_t index);
AIK_DOOM_EXPORT int doom_actor_line_of_sight(uint32_t index);

void aik_doom_log(const char *message);
uint32_t aik_doom_ticks_ms(void);
void aik_doom_sleep_ms(uint32_t milliseconds);

#ifdef __cplusplus
}
#endif

#endif
