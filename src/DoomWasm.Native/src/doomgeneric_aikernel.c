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
#include "doomstat.h"
#include "p_local.h"
#include "r_state.h"
#define AIK_DOOM_HAS_DOOMGENERIC 1
#endif
#endif

#if !defined(AIK_DOOM_HAS_DOOMGENERIC)
typedef uint8_t pixel_t;
#endif

#ifndef KEY_ESCAPE
#define KEY_ESCAPE 27
#endif

#define AIK_DOOM_ACTOR_SNAPSHOT_CAPACITY 64u

typedef struct
{
    uint32_t identity;
    int32_t x_fixed;
    int32_t y_fixed;
    int32_t sector_index;
    int32_t type;
    int32_t health;
    uint32_t flags;
    int line_of_sight;
} aik_doom_actor_fact_t;

static int g_initialized = 0;
static int g_level_load_sequence_available = 0;
static uint32_t g_level_load_sequence = 0;
static pixel_t g_fallback_framebuffer[DOOMGENERIC_RESX * DOOMGENERIC_RESY];
static int g_actor_snapshot_available = 0;
static int32_t g_actor_snapshot_gametic = 0;
static uint32_t g_actor_snapshot_count = 0;
static int g_actor_snapshot_truncated = 0;
static aik_doom_actor_fact_t g_actor_snapshot[AIK_DOOM_ACTOR_SNAPSHOT_CAPACITY];

static void aik_doom_reset_actor_snapshot(void)
{
    g_actor_snapshot_available = 0;
    g_actor_snapshot_gametic = 0;
    g_actor_snapshot_count = 0;
    g_actor_snapshot_truncated = 0;
    memset(g_actor_snapshot, 0, sizeof(g_actor_snapshot));
}

#if defined(AIK_DOOM_HAS_DOOMGENERIC)
static int g_level_load_identity_observed = 0;
static int g_level_load_last_levelstarttic = 0;
static int g_level_load_last_gameepisode = 0;
static int g_level_load_last_gamemap = 0;
static mobj_t *aik_doom_player_mobj(void);
static void aik_doom_capture_actor_snapshot(void);

static void aik_doom_observe_level_load(void)
{
    int identity_changed;

    if (gamestate != GS_LEVEL)
    {
        return;
    }

    identity_changed = !g_level_load_identity_observed
        || levelstarttic != g_level_load_last_levelstarttic
        || gameepisode != g_level_load_last_gameepisode
        || gamemap != g_level_load_last_gamemap;

    if (identity_changed)
    {
        if (g_level_load_sequence < UINT32_MAX)
        {
            ++g_level_load_sequence;
        }

        g_level_load_last_levelstarttic = levelstarttic;
        g_level_load_last_gameepisode = gameepisode;
        g_level_load_last_gamemap = gamemap;
        g_level_load_identity_observed = 1;
    }

    g_level_load_sequence_available = 1;
}
#endif

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
    aik_doom_input_action_reset();
    g_level_load_sequence_available = 0;
    aik_doom_reset_actor_snapshot();
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    g_level_load_identity_observed = 0;
    singletics = true;
    doomgeneric_Create(g_doom_argc, g_doom_argv);
    aik_doom_observe_level_load();
#else
    DG_Init();
#endif
    g_initialized = 1;
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    aik_doom_capture_actor_snapshot();
#endif
    return AIK_DOOM_OK;
}

int doom_tick(void)
{
    if (!g_initialized) {
        return AIK_DOOM_ERROR_NOT_INITIALIZED;
    }

#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    doomgeneric_Tick();
    aik_doom_observe_level_load();
    aik_doom_capture_actor_snapshot();
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

int doom_run_facts_available(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized ? 1 : 0;
#else
    return 0;
#endif
}

int32_t doom_run_gametic(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized ? (int32_t)gametic : 0;
#else
    return 0;
#endif
}

int32_t doom_run_leveltime(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized ? (int32_t)leveltime : 0;
#else
    return 0;
#endif
}

int32_t doom_run_levelstarttic(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized ? (int32_t)levelstarttic : 0;
#else
    return 0;
#endif
}

int32_t doom_run_gamestate(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized ? (int32_t)gamestate : 0;
#else
    return 0;
#endif
}

int32_t doom_run_gameepisode(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized ? (int32_t)gameepisode : 0;
#else
    return 0;
#endif
}

int32_t doom_run_gamemap(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized ? (int32_t)gamemap : 0;
#else
    return 0;
#endif
}

int doom_run_level_load_sequence_available(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_initialized && g_level_load_sequence_available ? 1 : 0;
#else
    return 0;
#endif
}

uint32_t doom_run_level_load_sequence(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return g_level_load_sequence;
#else
    return 0;
#endif
}

#if defined(AIK_DOOM_HAS_DOOMGENERIC)
static mobj_t *aik_doom_player_mobj(void)
{
    if (!g_initialized
        || gamestate != GS_LEVEL
        || consoleplayer < 0
        || consoleplayer >= MAXPLAYERS
        || !playeringame[consoleplayer]
        || players[consoleplayer].mo == 0)
    {
        return 0;
    }

    return players[consoleplayer].mo;
}

static int32_t aik_doom_mobj_sector_index(const mobj_t *actor)
{
    uintptr_t sector_address;
    uintptr_t sectors_address;
    uintptr_t byte_offset;
    uintptr_t index;

    if (actor == 0
        || actor->subsector == 0
        || actor->subsector->sector == 0
        || sectors == 0
        || numsectors <= 0)
    {
        return -1;
    }

    sector_address = (uintptr_t)actor->subsector->sector;
    sectors_address = (uintptr_t)sectors;
    if (sector_address < sectors_address)
    {
        return -1;
    }

    byte_offset = sector_address - sectors_address;
    if (byte_offset % sizeof(*sectors) != 0)
    {
        return -1;
    }

    index = byte_offset / sizeof(*sectors);
    return index < (uintptr_t)numsectors ? (int32_t)index : -1;
}

static int32_t aik_doom_state_index(const state_t *state)
{
    uintptr_t state_address;
    uintptr_t states_address;
    uintptr_t byte_offset;
    uintptr_t index;

    if (state == 0)
    {
        return -1;
    }

    state_address = (uintptr_t)state;
    states_address = (uintptr_t)states;
    if (state_address < states_address)
    {
        return -1;
    }

    byte_offset = state_address - states_address;
    if (byte_offset % sizeof(*states) != 0)
    {
        return -1;
    }

    index = byte_offset / sizeof(*states);
    return index < (uintptr_t)NUMSTATES ? (int32_t)index : -1;
}

static int aik_doom_player_weapon_facts_valid(void)
{
    player_t *player;
    int32_t weapon_state;
    int32_t ready_state;

    if (aik_doom_player_mobj() == 0)
    {
        return 0;
    }

    player = &players[consoleplayer];
    if (player->readyweapon < wp_fist
        || player->readyweapon >= NUMWEAPONS
        || (player->pendingweapon != wp_nochange
            && (player->pendingweapon < wp_fist
                || player->pendingweapon >= NUMWEAPONS))
        || player->refire < 0)
    {
        return 0;
    }

    weapon_state = aik_doom_state_index(player->psprites[ps_weapon].state);
    ready_state = (int32_t)weaponinfo[player->readyweapon].readystate;
    return weapon_state >= 0 && ready_state >= 0 && ready_state < NUMSTATES;
}

static void aik_doom_capture_actor_snapshot(void)
{
    mobj_t *player = aik_doom_player_mobj();
    thinker_t *thinker;

    aik_doom_reset_actor_snapshot();
    if (player == 0 || thinkercap.next == 0 || thinkercap.prev == 0)
    {
        return;
    }

    g_actor_snapshot_gametic = (int32_t)gametic;
    for (thinker = thinkercap.next;
         thinker != &thinkercap;
         thinker = thinker->next)
    {
        mobj_t *actor;
        aik_doom_actor_fact_t *fact;

        if (thinker->function.acp1 != (actionf_p1)P_MobjThinker)
        {
            continue;
        }

        actor = (mobj_t *)thinker;
        if ((actor->flags & MF_COUNTKILL) == 0)
        {
            continue;
        }

        if (g_actor_snapshot_count >= AIK_DOOM_ACTOR_SNAPSHOT_CAPACITY)
        {
            g_actor_snapshot_truncated = 1;
            break;
        }

        fact = &g_actor_snapshot[g_actor_snapshot_count++];
        fact->identity = (uint32_t)(uintptr_t)actor;
        fact->x_fixed = (int32_t)actor->x;
        fact->y_fixed = (int32_t)actor->y;
        fact->sector_index = aik_doom_mobj_sector_index(actor);
        fact->type = (int32_t)actor->type;
        fact->health = (int32_t)actor->health;
        fact->flags = (uint32_t)actor->flags;
        fact->line_of_sight = P_CheckSight(player, actor) ? 1 : 0;
    }

    g_actor_snapshot_available = 1;
}
#endif

int doom_player_facts_available(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_mobj() != 0 ? 1 : 0;
#else
    return 0;
#endif
}

int32_t doom_player_x_fixed(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    mobj_t *player = aik_doom_player_mobj();
    return player != 0 ? (int32_t)player->x : 0;
#else
    return 0;
#endif
}

int32_t doom_player_y_fixed(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    mobj_t *player = aik_doom_player_mobj();
    return player != 0 ? (int32_t)player->y : 0;
#else
    return 0;
#endif
}

uint32_t doom_player_angle_bam(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    mobj_t *player = aik_doom_player_mobj();
    return player != 0 ? (uint32_t)player->angle : 0;
#else
    return 0;
#endif
}

int32_t doom_player_momx_fixed(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    mobj_t *player = aik_doom_player_mobj();
    return player != 0 ? (int32_t)player->momx : 0;
#else
    return 0;
#endif
}

int32_t doom_player_momy_fixed(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    mobj_t *player = aik_doom_player_mobj();
    return player != 0 ? (int32_t)player->momy : 0;
#else
    return 0;
#endif
}

int32_t doom_player_sector_index(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_mobj_sector_index(aik_doom_player_mobj());
#else
    return -1;
#endif
}

int32_t doom_player_health(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_mobj() != 0
        ? (int32_t)players[consoleplayer].health
        : 0;
#else
    return 0;
#endif
}

int32_t doom_player_state(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_mobj() != 0
        ? (int32_t)players[consoleplayer].playerstate
        : 0;
#else
    return 0;
#endif
}

int32_t doom_player_kill_count(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_mobj() != 0
        ? (int32_t)players[consoleplayer].killcount
        : 0;
#else
    return 0;
#endif
}

int32_t doom_state_count(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return (int32_t)NUMSTATES;
#else
    return 0;
#endif
}

int doom_player_weapon_facts_available(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_weapon_facts_valid() ? 1 : 0;
#else
    return 0;
#endif
}

int32_t doom_player_ready_weapon(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_weapon_facts_valid()
        ? (int32_t)players[consoleplayer].readyweapon
        : 0;
#else
    return 0;
#endif
}

int32_t doom_player_pending_weapon(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_weapon_facts_valid()
        ? (int32_t)players[consoleplayer].pendingweapon
        : 0;
#else
    return 0;
#endif
}

int32_t doom_player_weapon_state(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_weapon_facts_valid()
        ? aik_doom_state_index(players[consoleplayer].psprites[ps_weapon].state)
        : 0;
#else
    return 0;
#endif
}

int32_t doom_player_weapon_ready_state(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_weapon_facts_valid()
        ? (int32_t)weaponinfo[players[consoleplayer].readyweapon].readystate
        : 0;
#else
    return 0;
#endif
}

int32_t doom_player_refire(void)
{
#if defined(AIK_DOOM_HAS_DOOMGENERIC)
    return aik_doom_player_weapon_facts_valid()
        ? (int32_t)players[consoleplayer].refire
        : 0;
#else
    return 0;
#endif
}

int doom_actor_snapshot_available(void)
{
    return g_actor_snapshot_available;
}

int32_t doom_actor_snapshot_gametic(void)
{
    return g_actor_snapshot_gametic;
}

uint32_t doom_actor_snapshot_count(void)
{
    return g_actor_snapshot_count;
}

uint32_t doom_actor_snapshot_capacity(void)
{
    return AIK_DOOM_ACTOR_SNAPSHOT_CAPACITY;
}

int doom_actor_snapshot_truncated(void)
{
    return g_actor_snapshot_truncated;
}

uint32_t doom_actor_identity(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].identity
        : 0;
}

int32_t doom_actor_x_fixed(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].x_fixed
        : 0;
}

int32_t doom_actor_y_fixed(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].y_fixed
        : 0;
}

int32_t doom_actor_sector_index(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].sector_index
        : -1;
}

int32_t doom_actor_type(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].type
        : 0;
}

int32_t doom_actor_health(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].health
        : 0;
}

uint32_t doom_actor_flags(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].flags
        : 0;
}

int doom_actor_line_of_sight(uint32_t index)
{
    return index < g_actor_snapshot_count
        ? g_actor_snapshot[index].line_of_sight
        : 0;
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
