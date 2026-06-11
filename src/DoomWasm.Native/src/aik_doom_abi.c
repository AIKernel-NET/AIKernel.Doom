#include "aik_doom_abi.h"
#include "aik_doom_input.h"
#include "aik_doom_wad.h"

int doom_mount_wad(uint8_t *data, uint32_t size)
{
    return aik_doom_mount_wad(data, (size_t)size);
}

int doom_wad_status(void)
{
    return aik_doom_wad_status();
}

void doom_input(int keycode, int pressed)
{
    (void)aik_doom_input_push(keycode, pressed);
}

static int g_action_forward = 0;
static int g_action_back = 0;
static int g_action_right = 0;
static int g_action_left = 0;
static int g_action_fire = 0;
static int g_action_strafe = 0;

static int aik_doom_push_action_key(int keycode, int *current, int desired)
{
    if (*current == desired) {
        return AIK_DOOM_OK;
    }

    *current = desired;
    return aik_doom_input_push(keycode, desired);
}

int doom_input_action(int move, int turn, int fire, int strafe)
{
    int result = AIK_DOOM_OK;
    int forward = move > 0 ? 1 : 0;
    int back = move < 0 ? 1 : 0;
    int right = turn > 0 ? 1 : 0;
    int left = turn < 0 ? 1 : 0;

    result = aik_doom_push_action_key(0xad, &g_action_forward, forward);

    if (result != AIK_DOOM_OK) {
        return result;
    }

    result = aik_doom_push_action_key(0xaf, &g_action_back, back);

    if (result != AIK_DOOM_OK) {
        return result;
    }

    result = aik_doom_push_action_key(0xae, &g_action_right, right);

    if (result != AIK_DOOM_OK) {
        return result;
    }

    result = aik_doom_push_action_key(0xac, &g_action_left, left);

    if (result != AIK_DOOM_OK) {
        return result;
    }

    result = aik_doom_push_action_key(0xa3, &g_action_fire, fire ? 1 : 0);

    if (result != AIK_DOOM_OK) {
        return result;
    }

    return aik_doom_push_action_key(0xb8, &g_action_strafe, strafe ? 1 : 0);
}
