#include "aik_doom_input.h"

#define AIK_DOOM_INPUT_QUEUE_CAPACITY 64

static aik_doom_key_event_t g_events[AIK_DOOM_INPUT_QUEUE_CAPACITY];
static int g_head = 0;
static int g_tail = 0;
static int g_count = 0;

void aik_doom_input_reset(void)
{
    g_head = 0;
    g_tail = 0;
    g_count = 0;
}

int aik_doom_input_push(int keycode, int pressed)
{
    if (g_count >= AIK_DOOM_INPUT_QUEUE_CAPACITY) {
        return AIK_DOOM_ERROR_INPUT_QUEUE_FULL;
    }

    g_events[g_tail].keycode = keycode;
    g_events[g_tail].pressed = pressed ? 1 : 0;
    g_tail = (g_tail + 1) % AIK_DOOM_INPUT_QUEUE_CAPACITY;
    g_count++;
    return AIK_DOOM_OK;
}

int aik_doom_input_pop(aik_doom_key_event_t *event_out)
{
    if (event_out == 0 || g_count == 0) {
        return 0;
    }

    *event_out = g_events[g_head];
    g_head = (g_head + 1) % AIK_DOOM_INPUT_QUEUE_CAPACITY;
    g_count--;
    return 1;
}
