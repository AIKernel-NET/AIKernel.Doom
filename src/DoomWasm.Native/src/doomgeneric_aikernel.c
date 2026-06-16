#include "aik_doom_abi.h"
#include "aik_doom_input.h"
#include "aik_doom_wad.h"

#include <stdint.h>
#include <string.h>

#ifndef DOOMGENERIC_RESX
#define DOOMGENERIC_RESX 320
#endif

#ifndef DOOMGENERIC_RESY
#define DOOMGENERIC_RESY 200
#endif

#ifndef CMAP256
#define CMAP256 1
#endif

#if defined(__has_include)
#if __has_include("doomgeneric.h")
#include "doomgeneric.h"
#include "d_loop.h"
#define AIK_DOOM_HAS_DOOMGENERIC 1
#endif
#endif

#if !defined(AIK_DOOM_HAS_DOOMGENERIC)
typedef uint8_t pixel_t;
#endif

#ifndef KEY_ESCAPE
#define KEY_ESCAPE 27
#endif

static int g_initialized = 0;
static pixel_t g_fallback_framebuffer[DOOMGENERIC_RESX * DOOMGENERIC_RESY];

#if !defined(AIK_DOOM_HAS_DOOMGENERIC)
pixel_t *DG_ScreenBuffer = g_fallback_framebuffer;
static void DG_Init(void) {}
static void DG_DrawFrame(void) {}
static void DG_SleepMs(uint32_t ms) { aik_doom_sleep_ms(ms); }
static uint32_t DG_GetTicksMs(void) { return aik_doom_ticks_ms(); }
static int DG_GetKey(int *pressed, unsigned char *doomKey)
{
    aik_doom_key_event_t event;
    if (!aik_doom_input_pop(&event)) {
        return 0;
    }

    *pressed = event.pressed;
    *doomKey = (unsigned char)event.keycode;
    return 1;
}
#else
extern pixel_t *DG_ScreenBuffer;
#endif

static char *g_doom_argv[] = {
    (char *)"doom.wasm",
    (char *)"-iwad",
    (char *)"doom1.wad",
    (char *)"-nogui",
    (char *)"-nomusic",
    0
};

static int g_doom_argc = 5;

int main(int argc, char **argv)
{
    (void)argc;
    (void)argv;
    return AIK_DOOM_OK;
}

int doom_init(void)
{
    int wad_status = aik_doom_wad_status();
    if (wad_status != AIK_DOOM_OK) {
        return wad_status;
    }

    aik_doom_input_reset();
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    singletics = true;
    doomgeneric_Create(g_doom_argc, g_doom_argv);
#else
    DG_Init();
#endif
    g_initialized = 1;
    return AIK_DOOM_OK;
}

int doom_tick(void)
{
    if (!g_initialized) {
        return AIK_DOOM_ERROR_NOT_INITIALIZED;
    }

#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    doomgeneric_Tick();
#else
    DG_DrawFrame();
#endif
    return AIK_DOOM_OK;
}

uint8_t *doom_render(void)
{
    if (!g_initialized || DG_ScreenBuffer == 0) {
        return 0;
    }

    return (uint8_t *)DG_ScreenBuffer;
}

#if defined(AIK_DOOM_HAS_DOOMGENERIC)
void DG_Init(void)
{
    aik_doom_log("doomgeneric AIKernel platform initialized");
}

void DG_DrawFrame(void)
{
}

void DG_SleepMs(uint32_t ms)
{
    aik_doom_sleep_ms(ms);
}

uint32_t DG_GetTicksMs(void)
{
    return aik_doom_ticks_ms();
}

int DG_GetKey(int *pressed, unsigned char *doomKey)
{
    aik_doom_key_event_t event;
    if (!aik_doom_input_pop(&event)) {
        return 0;
    }

    *pressed = event.pressed;
    *doomKey = (unsigned char)event.keycode;
    return 1;
}

void DG_SetWindowTitle(const char *title)
{
    (void)title;
}
#endif
