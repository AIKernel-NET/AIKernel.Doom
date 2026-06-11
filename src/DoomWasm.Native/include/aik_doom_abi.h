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
AIK_DOOM_EXPORT void doom_input(int keycode, int pressed);
AIK_DOOM_EXPORT int doom_input_action(int move, int turn, int fire, int strafe);
AIK_DOOM_EXPORT int doom_mount_wad(uint8_t *data, uint32_t size);
AIK_DOOM_EXPORT int doom_wad_status(void);

void aik_doom_log(const char *message);
uint32_t aik_doom_ticks_ms(void);
void aik_doom_sleep_ms(uint32_t milliseconds);

#ifdef __cplusplus
}
#endif

#endif
