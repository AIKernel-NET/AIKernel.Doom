#include "aik_doom_abi.h"

#if defined(__EMSCRIPTEN__)
#include <emscripten/emscripten.h>
#else
#include <time.h>
#endif

uint32_t aik_doom_ticks_ms(void)
{
#if defined(__EMSCRIPTEN__)
    return (uint32_t)emscripten_get_now();
#else
    return (uint32_t)((clock() * 1000U) / CLOCKS_PER_SEC);
#endif
}

void aik_doom_sleep_ms(uint32_t milliseconds)
{
    (void)milliseconds;
}
