/*
 * Experimental only.
 *
 * This prototype is intentionally excluded from the production DoomWasm.Native
 * build and from aik_doom_abi.h. Runtime control policy belongs in the
 * AIKernel.Control -> AIKernel.Wasm control runtime path; the native doom.wasm
 * overlay remains limited to engine compatibility and I/O adaptation.
 */

#include "aik_doom_abi.h"

#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define AIK_SENSOR_TENSOR_ROWS 4
#define AIK_SENSOR_TENSOR_COLS 8
#define AIK_SENSOR_TENSOR_SIZE (AIK_SENSOR_TENSOR_ROWS * AIK_SENSOR_TENSOR_COLS)
#define AIK_SENSOR_TENSOR_OFFSET(row, col) ((row * AIK_SENSOR_TENSOR_COLS) + col)
#define AIK_SENSOR_VISION_ENEMY AIK_SENSOR_TENSOR_OFFSET(0, 2)
#define AIK_SENSOR_VISION_OPEN AIK_SENSOR_TENSOR_OFFSET(0, 6)
#define AIK_SENSOR_SEMANTIC_DOOR AIK_SENSOR_TENSOR_OFFSET(2, 0)
#define AIK_SENSOR_SEMANTIC_CORRIDOR AIK_SENSOR_TENSOR_OFFSET(2, 1)
#define AIK_SENSOR_SEMANTIC_COMPUTER AIK_SENSOR_TENSOR_OFFSET(2, 2)
#define AIK_SENSOR_SEMANTIC_BRIDGE AIK_SENSOR_TENSOR_OFFSET(2, 3)
#define AIK_SENSOR_SEMANTIC_MAP_ENEMY AIK_SENSOR_TENSOR_OFFSET(2, 7)
#define AIK_SENSOR_SYSTEM_HEALTH AIK_SENSOR_TENSOR_OFFSET(3, 1)
#define AIK_SENSOR_SYSTEM_COMBAT AIK_SENSOR_TENSOR_OFFSET(3, 3)

typedef struct {
    char strategy_name[96];
    int door_aim_tolerance_degrees;
    int door_soft_aim_tolerance_degrees;
    int door_aim_yaw_degrees;
    int emergency_stuck_ticks;
    int door_probe_stuck_ticks;
    double door_use_depth;
    double blocked_depth;
    double combat_face_threshold;
    int combat_yaw_degrees;
    int low_health_threshold;
    int emergency_escape_yaw_degrees;
    int wall_away_yaw_degrees;
    int open_cruise_yaw_degrees;
    double open_cruise_wall_vector_dead_zone;
    int enable_strafe_run;
    int ctg_enable_trivalent_council;
    int ctg_enforce_gate;
    int ctg_trace_only;
    int ctg_quorum;
    double ctg_logos_approval_threshold;
    double ctg_ethos_reject_danger_threshold;
    double ctg_pathos_reject_danger_threshold;
} aik_autoplay_profile_t;

typedef struct {
    int frame;
    double depth_sig;
    int health;
    double face_sig;
    char context[48];
    char objective[64];
    int sound_event;
    int stuck_ticks;
    int q_delta;
    int recovery_frames;
    double wall_vector;
    double door_confidence;
    double corridor_confidence;
    double enemy_confidence;
    double safe_zone_confidence;
    double bridge_confidence;
    double computer_room_confidence;
    int sensor_tensor_present;
    double sensor_tensor[AIK_SENSOR_TENSOR_SIZE];
} aik_autoplay_state_t;

typedef struct {
    const char *move;
    const char *turn;
    int fire;
    int strafe;
    int use;
    int run;
} aik_autoplay_action_t;

static aik_autoplay_profile_t g_profile = {
    "SeparatedDoorProbeStrafeRunnerV4",
    14,
    28,
    10,
    54,
    12,
    0.62,
    0.28,
    0.35,
    18,
    18,
    34,
    10,
    7,
    0.08,
    1,
    1,
    0,
    1,
    2,
    0.52,
    0.78,
    0.72
};
static unsigned int g_predictions = 0;
static char g_pipeline[64] = "uninitialized";
static char g_objective[64] = "idle";
static char g_last_error[128] = "";
static int g_strategy_priority = 0;
static double g_evidence_score = 0;
static double g_semantic_door = 0;
static double g_semantic_corridor = 0;
static double g_semantic_enemy = 0;
static double g_semantic_safe_zone = 0;
static double g_semantic_bridge = 0;
static double g_semantic_computer_room = 0;
static int g_ctg_gate_executed = 0;
static char g_ctg_decision[16] = "Allow";
static char g_ctg_reason[48] = "not-evaluated";
static int g_ctg_approvals = 0;
static int g_ctg_rejects = 0;
static int g_ctg_abstentions = 0;
static int g_ctg_action_changed = 0;
static char g_ctg_logos_vote[12] = "Abstain";
static char g_ctg_logos_reason[48] = "not-evaluated";
static char g_ctg_ethos_vote[12] = "Abstain";
static char g_ctg_ethos_reason[48] = "not-evaluated";
static char g_ctg_pathos_vote[12] = "Abstain";
static char g_ctg_pathos_reason[48] = "not-evaluated";

static const char *aik_json_find_key(const char *json, int len, const char *key)
{
    char pattern[96];
    int pattern_len = snprintf(pattern, sizeof(pattern), "\"%s\"", key);
    if (pattern_len <= 0 || pattern_len >= (int)sizeof(pattern)) {
        return 0;
    }

    for (int i = 0; i <= len - pattern_len; i++) {
        if (memcmp(json + i, pattern, (size_t)pattern_len) == 0) {
            const char *cursor = json + i + pattern_len;
            const char *end = json + len;
            while (cursor < end && isspace((unsigned char)*cursor)) {
                cursor++;
            }
            if (cursor < end && *cursor == ':') {
                cursor++;
                while (cursor < end && isspace((unsigned char)*cursor)) {
                    cursor++;
                }
                return cursor;
            }
        }
    }

    return 0;
}

static double aik_json_number(const char *json, int len, const char *key, double fallback)
{
    const char *cursor = aik_json_find_key(json, len, key);
    if (cursor == 0) {
        return fallback;
    }

    char *end = 0;
    double value = strtod(cursor, &end);
    return end != cursor ? value : fallback;
}

static int aik_json_bool(const char *json, int len, const char *key, int fallback)
{
    const char *cursor = aik_json_find_key(json, len, key);
    if (cursor == 0) {
        return fallback;
    }

    if (strncmp(cursor, "true", 4) == 0) {
        return 1;
    }

    if (strncmp(cursor, "false", 5) == 0) {
        return 0;
    }

    return fallback;
}

static int aik_json_number_array(const char *json, int len, const char *key, double *values, int capacity)
{
    if (values == 0 || capacity <= 0) {
        return 0;
    }

    const char *cursor = aik_json_find_key(json, len, key);
    const char *end = json + len;
    if (cursor == 0 || cursor >= end || *cursor != '[') {
        return 0;
    }

    cursor++;
    int count = 0;
    while (cursor < end && *cursor != ']' && count < capacity) {
        while (cursor < end && (isspace((unsigned char)*cursor) || *cursor == ',')) {
            cursor++;
        }

        if (cursor >= end || *cursor == ']') {
            break;
        }

        char *number_end = 0;
        double value = strtod(cursor, &number_end);
        if (number_end == cursor) {
            cursor++;
            continue;
        }

        values[count++] = !isfinite(value) ? 0 : (value < 0 ? 0 : (value > 1 ? 1 : value));
        cursor = number_end;
    }

    return count;
}

static int aik_read_sensor_tensor(const char *json, int len, aik_autoplay_state_t *state)
{
    for (int i = 0; i < AIK_SENSOR_TENSOR_SIZE; i++) {
        state->sensor_tensor[i] = 0;
    }

    state->sensor_tensor_present = 0;
    const char *tensor = aik_json_find_key(json, len, "sensorTensor");
    if (tensor == 0) {
        return 0;
    }

    int tensor_len = (int)((json + len) - tensor);
    int count = aik_json_number_array(tensor, tensor_len, "data", state->sensor_tensor, AIK_SENSOR_TENSOR_SIZE);
    state->sensor_tensor_present = count >= AIK_SENSOR_TENSOR_SIZE;
    return state->sensor_tensor_present;
}

static void aik_json_string(const char *json, int len, const char *key, const char *fallback, char *buffer, int capacity)
{
    const char *cursor = aik_json_find_key(json, len, key);
    if (cursor == 0 || *cursor != '"') {
        snprintf(buffer, (size_t)capacity, "%s", fallback);
        return;
    }

    cursor++;
    const char *end = json + len;
    int index = 0;
    while (cursor < end && *cursor != '"' && index + 1 < capacity) {
        buffer[index++] = *cursor++;
    }
    buffer[index] = '\0';
}

static int aik_clamp_int(int value, int min, int max)
{
    return value < min ? min : (value > max ? max : value);
}

static double aik_clamp_double(double value, double min, double max)
{
    return value < min ? min : (value > max ? max : value);
}

static const char *aik_turn_from_yaw(int yaw)
{
    if (yaw > 0) {
        return "right";
    }

    if (yaw < 0) {
        return "left";
    }

    return "none";
}

static int aik_escape_yaw(double wall_vector)
{
    return wall_vector > 0 ? -g_profile.emergency_escape_yaw_degrees : g_profile.emergency_escape_yaw_degrees;
}

static int aik_wall_away_yaw(double wall_vector)
{
    return wall_vector > 0 ? -g_profile.wall_away_yaw_degrees : g_profile.wall_away_yaw_degrees;
}

static int aik_combat_yaw(double face_sig)
{
    return face_sig < -g_profile.combat_face_threshold ? -g_profile.combat_yaw_degrees : g_profile.combat_yaw_degrees;
}

static int aik_open_cruise_yaw(double wall_vector)
{
    if (fabs(wall_vector) < g_profile.open_cruise_wall_vector_dead_zone) {
        return 0;
    }

    return wall_vector > 0 ? -g_profile.open_cruise_yaw_degrees : g_profile.open_cruise_yaw_degrees;
}

static int aik_text_contains(const char *text, const char *needle)
{
    if (text == 0 || needle == 0) {
        return 0;
    }

    return strstr(text, needle) != 0;
}

static double aik_max_double(double a, double b)
{
    return a > b ? a : b;
}

static double aik_weighted_evidence(double a, double aw, double b, double bw)
{
    return aik_clamp_double((a * aw) + (b * bw), 0, 1);
}

static double aik_sensor_tensor_value(const aik_autoplay_state_t *state, int offset)
{
    if (state == 0 || !state->sensor_tensor_present || offset < 0 || offset >= AIK_SENSOR_TENSOR_SIZE) {
        return 0;
    }

    return aik_clamp_double(state->sensor_tensor[offset], 0, 1);
}

static void aik_copy_text(char *buffer, int capacity, const char *value)
{
    snprintf(buffer, (size_t)capacity, "%s", value == 0 ? "" : value);
}

static void aik_reset_ctg_trace(void)
{
    g_ctg_gate_executed = 0;
    aik_copy_text(g_ctg_decision, (int)sizeof(g_ctg_decision), "Allow");
    aik_copy_text(g_ctg_reason, (int)sizeof(g_ctg_reason), "not-evaluated");
    g_ctg_approvals = 0;
    g_ctg_rejects = 0;
    g_ctg_abstentions = 0;
    g_ctg_action_changed = 0;
    aik_copy_text(g_ctg_logos_vote, (int)sizeof(g_ctg_logos_vote), "Abstain");
    aik_copy_text(g_ctg_logos_reason, (int)sizeof(g_ctg_logos_reason), "not-evaluated");
    aik_copy_text(g_ctg_ethos_vote, (int)sizeof(g_ctg_ethos_vote), "Abstain");
    aik_copy_text(g_ctg_ethos_reason, (int)sizeof(g_ctg_ethos_reason), "not-evaluated");
    aik_copy_text(g_ctg_pathos_vote, (int)sizeof(g_ctg_pathos_vote), "Abstain");
    aik_copy_text(g_ctg_pathos_reason, (int)sizeof(g_ctg_pathos_reason), "not-evaluated");
}

static int aik_vote_value(const char *vote)
{
    if (strcmp(vote, "Approve") == 0) {
        return 1;
    }

    if (strcmp(vote, "Reject") == 0) {
        return -1;
    }

    return 0;
}

static void aik_count_ctg_vote(const char *vote)
{
    int value = aik_vote_value(vote);
    if (value > 0) {
        g_ctg_approvals++;
    } else if (value < 0) {
        g_ctg_rejects++;
    } else {
        g_ctg_abstentions++;
    }
}

static void aik_set_vote(char *vote_buffer, int vote_capacity, char *reason_buffer, int reason_capacity, const char *vote, const char *reason)
{
    aik_copy_text(vote_buffer, vote_capacity, vote);
    aik_copy_text(reason_buffer, reason_capacity, reason);
    aik_count_ctg_vote(vote);
}

static void aik_apply_ctg_gate(const aik_autoplay_state_t *state, aik_autoplay_action_t *action)
{
    aik_reset_ctg_trace();
    if (!g_profile.ctg_enable_trivalent_council) {
        aik_copy_text(g_ctg_reason, (int)sizeof(g_ctg_reason), "trivalent-council-disabled");
        return;
    }

    g_ctg_gate_executed = 1;
    double danger = aik_clamp_double(aik_max_double(g_semantic_enemy, state->health <= 0 ? 1.0 : 0.0), 0, 1);
    double stuck = aik_clamp_double((double)state->stuck_ticks / (double)aik_max_double(g_profile.emergency_stuck_ticks, 1), 0, 1);
    double route = aik_clamp_double(aik_max_double(aik_max_double(g_semantic_door, g_semantic_corridor), aik_max_double(g_semantic_bridge, g_semantic_computer_room)), 0, 1);
    double safe = aik_clamp_double(g_semantic_safe_zone, 0, 1);

    if (strcmp(action->move, "forward") == 0 && g_evidence_score < g_profile.ctg_logos_approval_threshold && route < 0.34 && strcmp(state->context, "wall") == 0) {
        aik_set_vote(g_ctg_logos_vote, (int)sizeof(g_ctg_logos_vote), g_ctg_logos_reason, (int)sizeof(g_ctg_logos_reason), "Reject", "action-opposes-route-evidence");
    } else if (action->use && g_semantic_door < 0.28 && route < 0.28) {
        aik_set_vote(g_ctg_logos_vote, (int)sizeof(g_ctg_logos_vote), g_ctg_logos_reason, (int)sizeof(g_ctg_logos_reason), "Abstain", "use-target-not-logically-confirmed");
    } else if (g_evidence_score >= g_profile.ctg_logos_approval_threshold || route >= 0.46 || g_semantic_corridor >= 0.58) {
        aik_set_vote(g_ctg_logos_vote, (int)sizeof(g_ctg_logos_vote), g_ctg_logos_reason, (int)sizeof(g_ctg_logos_reason), "Approve", "objective-action-aligned");
    } else {
        aik_set_vote(g_ctg_logos_vote, (int)sizeof(g_ctg_logos_vote), g_ctg_logos_reason, (int)sizeof(g_ctg_logos_reason), "Abstain", "insufficient-logical-evidence");
    }

    if (state->health <= 0) {
        aik_set_vote(g_ctg_ethos_vote, (int)sizeof(g_ctg_ethos_vote), g_ctg_ethos_reason, (int)sizeof(g_ctg_ethos_reason), "Reject", "health-retry-veto");
    } else if (action->fire && g_semantic_enemy < 0.24 && danger < 0.24) {
        aik_set_vote(g_ctg_ethos_vote, (int)sizeof(g_ctg_ethos_vote), g_ctg_ethos_reason, (int)sizeof(g_ctg_ethos_reason), "Reject", "fire-without-enemy-evidence");
    } else if (action->use && g_semantic_door < 0.24 && route < 0.24) {
        aik_set_vote(g_ctg_ethos_vote, (int)sizeof(g_ctg_ethos_vote), g_ctg_ethos_reason, (int)sizeof(g_ctg_ethos_reason), "Abstain", "unknown-use-target");
    } else if (safe >= 0.42 || danger < 0.42) {
        aik_set_vote(g_ctg_ethos_vote, (int)sizeof(g_ctg_ethos_vote), g_ctg_ethos_reason, (int)sizeof(g_ctg_ethos_reason), "Approve", "safety-contract-satisfied");
    } else {
        aik_set_vote(g_ctg_ethos_vote, (int)sizeof(g_ctg_ethos_vote), g_ctg_ethos_reason, (int)sizeof(g_ctg_ethos_reason), "Abstain", "safety-contract-unknown");
    }

    if (danger >= g_profile.ctg_pathos_reject_danger_threshold && strcmp(action->move, "forward") == 0 && !action->fire) {
        aik_set_vote(g_ctg_pathos_vote, (int)sizeof(g_ctg_pathos_vote), g_ctg_pathos_reason, (int)sizeof(g_ctg_pathos_reason), "Reject", "danger-forward-repulsion");
    } else if ((danger >= 0.52 || stuck >= 0.58) && (strcmp(action->move, "back") == 0 || strcmp(action->turn, "none") != 0 || !action->run)) {
        aik_set_vote(g_ctg_pathos_vote, (int)sizeof(g_ctg_pathos_vote), g_ctg_pathos_reason, (int)sizeof(g_ctg_pathos_reason), "Approve", "protective-motion-selected");
    } else if (danger < 0.28 && stuck < 0.28) {
        aik_set_vote(g_ctg_pathos_vote, (int)sizeof(g_ctg_pathos_vote), g_ctg_pathos_reason, (int)sizeof(g_ctg_pathos_reason), "Approve", "low-affect-risk");
    } else {
        aik_set_vote(g_ctg_pathos_vote, (int)sizeof(g_ctg_pathos_vote), g_ctg_pathos_reason, (int)sizeof(g_ctg_pathos_reason), "Abstain", "affective-evidence-ambiguous");
    }

    if (strcmp(g_ctg_ethos_vote, "Reject") == 0) {
        aik_copy_text(g_ctg_decision, (int)sizeof(g_ctg_decision), "Deny");
        aik_copy_text(g_ctg_reason, (int)sizeof(g_ctg_reason), "ethos-veto");
    } else if (g_ctg_approvals >= g_profile.ctg_quorum) {
        aik_copy_text(g_ctg_decision, (int)sizeof(g_ctg_decision), "Allow");
        aik_copy_text(g_ctg_reason, (int)sizeof(g_ctg_reason), "quorum-met");
    } else if (g_ctg_rejects == 0 && g_ctg_abstentions > g_ctg_approvals) {
        aik_copy_text(g_ctg_decision, (int)sizeof(g_ctg_decision), "Deny");
        aik_copy_text(g_ctg_reason, (int)sizeof(g_ctg_reason), "unknown-fail-closed");
    } else {
        aik_copy_text(g_ctg_decision, (int)sizeof(g_ctg_decision), "Deny");
        aik_copy_text(g_ctg_reason, (int)sizeof(g_ctg_reason), "quorum-not-met");
    }

    if (g_profile.ctg_enforce_gate && !g_profile.ctg_trace_only && strcmp(g_ctg_decision, "Deny") == 0) {
        action->move = "none";
        action->fire = 0;
        action->strafe = 0;
        action->use = 0;
        action->run = 0;
        g_ctg_action_changed = 1;
    }
}

static void aik_set_decision_trace(const char *objective, const char *pipeline, int priority, double evidence)
{
    snprintf(g_objective, sizeof(g_objective), "%s", objective);
    snprintf(g_pipeline, sizeof(g_pipeline), "%s", pipeline);
    g_strategy_priority = priority;
    g_evidence_score = aik_clamp_double(evidence, 0, 1);
}

static double aik_semantic_door(const aik_autoplay_state_t *state, double depth)
{
    double context_door = strcmp(state->context, "wall") == 0
        || strcmp(state->context, "corner") == 0
        || (strcmp(state->context, "corridor") == 0 && (state->stuck_ticks >= g_profile.door_probe_stuck_ticks || depth <= 0.68))
            ? 1.0
            : 0.0;
    return aik_clamp_double(aik_max_double(aik_max_double(state->door_confidence, aik_sensor_tensor_value(state, AIK_SENSOR_SEMANTIC_DOOR)), context_door), 0, 1);
}

static double aik_semantic_corridor(const aik_autoplay_state_t *state)
{
    double context_corridor = strcmp(state->context, "corridor") == 0 ? 1.0 : 0.0;
    return aik_clamp_double(aik_max_double(aik_max_double(state->corridor_confidence, aik_sensor_tensor_value(state, AIK_SENSOR_SEMANTIC_CORRIDOR)), context_corridor), 0, 1);
}

static double aik_semantic_enemy(const aik_autoplay_state_t *state)
{
    double direct_enemy = state->sound_event || fabs(state->face_sig) >= g_profile.combat_face_threshold ? 1.0 : 0.0;
    double tensor_enemy = aik_max_double(
        aik_max_double(aik_sensor_tensor_value(state, AIK_SENSOR_VISION_ENEMY), aik_sensor_tensor_value(state, AIK_SENSOR_SEMANTIC_MAP_ENEMY)),
        aik_sensor_tensor_value(state, AIK_SENSOR_SYSTEM_COMBAT));
    return aik_clamp_double(aik_max_double(aik_max_double(state->enemy_confidence, tensor_enemy), direct_enemy), 0, 1);
}

static double aik_semantic_safe_zone(const aik_autoplay_state_t *state, double depth, double enemy)
{
    double direct_safe = state->health >= g_profile.low_health_threshold
        && enemy < 0.35
        && depth > g_profile.blocked_depth
        && fabs(state->wall_vector) < 0.5
            ? 1.0
            : 0.0;
    double tensor_safe = aik_max_double(
        aik_sensor_tensor_value(state, AIK_SENSOR_SYSTEM_HEALTH) * (1.0 - enemy),
        aik_sensor_tensor_value(state, AIK_SENSOR_VISION_OPEN) * 0.5);
    return aik_clamp_double(aik_max_double(aik_max_double(state->safe_zone_confidence, tensor_safe), direct_safe), 0, 1);
}

static int aik_aim_yaw(int q_delta, double wall_vector)
{
    int bounded = aik_clamp_int(q_delta, -180, 180);
    if (abs(bounded) > g_profile.door_soft_aim_tolerance_degrees) {
        return aik_clamp_int(bounded, -24, 24);
    }

    return wall_vector > 0 ? g_profile.door_aim_yaw_degrees : -g_profile.door_aim_yaw_degrees;
}

static aik_autoplay_action_t aik_action(const char *move, int yaw, int fire, int strafe, int use, int run)
{
    aik_autoplay_action_t action;
    action.move = move;
    action.turn = aik_turn_from_yaw(yaw);
    action.fire = fire ? 1 : 0;
    action.strafe = strafe ? 1 : 0;
    action.use = use ? 1 : 0;
    action.run = run ? 1 : 0;
    return action;
}

static aik_autoplay_action_t aik_door_probe(const aik_autoplay_state_t *state)
{
    int aligned = abs(state->q_delta) <= g_profile.door_aim_tolerance_degrees;
    if (!aligned) {
        snprintf(g_pipeline, sizeof(g_pipeline), "door-probe-align");
        return aik_action("none", aik_aim_yaw(state->q_delta, state->wall_vector), 0, 0, 0, 0);
    }

    if (state->depth_sig > g_profile.door_use_depth) {
        snprintf(g_pipeline, sizeof(g_pipeline), "door-probe-approach");
        return aik_action("forward", 0, 0, 0, 0, 0);
    }

    snprintf(g_pipeline, sizeof(g_pipeline), "door-probe-use");
    return aik_action("none", 0, 0, 0, 1, 0);
}

static aik_autoplay_action_t aik_predict_action(const aik_autoplay_state_t *state)
{
    double depth = aik_clamp_double(state->depth_sig, 0, 1);
    double wall = aik_clamp_double(state->wall_vector, -1, 1);
    double door = aik_semantic_door(state, depth);
    double corridor = aik_semantic_corridor(state);
    double enemy = aik_semantic_enemy(state);
    double safe_zone = aik_semantic_safe_zone(state, depth, enemy);
    double bridge = aik_clamp_double(aik_max_double(state->bridge_confidence, aik_sensor_tensor_value(state, AIK_SENSOR_SEMANTIC_BRIDGE)), 0, 1);
    double computer_room = aik_clamp_double(aik_max_double(state->computer_room_confidence, aik_sensor_tensor_value(state, AIK_SENSOR_SEMANTIC_COMPUTER)), 0, 1);
    g_semantic_door = door;
    g_semantic_corridor = corridor;
    g_semantic_enemy = enemy;
    g_semantic_safe_zone = safe_zone;
    g_semantic_bridge = bridge;
    g_semantic_computer_room = computer_room;

    aik_set_decision_trace(state->objective[0] ? state->objective : "advance-route", "arbitrating", 0, 0);

    if (state->health > 0 && state->health < g_profile.low_health_threshold) {
        int yaw = aik_escape_yaw(wall);
        aik_set_decision_trace("stabilize-safe-zone", "low-health-escape", 100, aik_weighted_evidence(safe_zone, 0.45, enemy, 0.20));
        return aik_action(
            depth > 0.42 ? "forward" : (depth <= g_profile.blocked_depth ? "back" : "none"),
            yaw,
            0,
            1,
            0,
            0);
    }

    if (state->recovery_frames > 0 || state->stuck_ticks >= g_profile.emergency_stuck_ticks) {
        int yaw = aik_escape_yaw(wall);
        int may_use = strcmp(state->context, "wall") == 0 && depth <= g_profile.door_use_depth;
        aik_set_decision_trace(
            "stabilize-safe-zone",
            state->recovery_frames > 0 ? "recovery-escape" : "stuck-escape",
            state->recovery_frames > 0 ? 90 : 89,
            state->recovery_frames > 0 ? safe_zone * 0.50 : aik_weighted_evidence(safe_zone, 0.40, corridor, 0.20));
        return aik_action(
            depth > g_profile.blocked_depth ? "forward" : "back",
            yaw,
            0,
            g_profile.enable_strafe_run,
            may_use,
            0);
    }

    if (aik_text_contains(state->objective, "enemy") || enemy >= 0.35) {
        int yaw = aik_combat_yaw(state->face_sig);
        aik_set_decision_trace("avoid-enemy", "combat-weighted", state->sound_event ? 80 : 79, enemy);
        return aik_action(
            depth > 0.5 ? "forward" : "none",
            yaw,
            depth < 0.82 || state->sound_event || enemy >= 0.55,
            g_profile.enable_strafe_run,
            0,
            0);
    }

    if (aik_text_contains(state->objective, "door")
        || door >= 0.35
        || strcmp(state->context, "corner") == 0
        || (strcmp(state->context, "wall") == 0 && state->stuck_ticks >= g_profile.door_probe_stuck_ticks)
        || (corridor >= 0.5 && state->stuck_ticks >= g_profile.door_probe_stuck_ticks * 2 && depth <= 0.68)) {
        aik_set_decision_trace("open-door", "door-probe", 70, aik_weighted_evidence(door, 0.70, corridor, 0.25));
        return aik_door_probe(state);
    }

    if (aik_text_contains(state->objective, "bridge") || bridge >= 0.35) {
        int yaw = aik_open_cruise_yaw(wall);
        aik_set_decision_trace("reach-bridge", "bridge-route-cruise", 45, bridge);
        return aik_action("forward", yaw, 0, g_profile.enable_strafe_run && yaw != 0, 0, 0);
    }

    if (aik_text_contains(state->objective, "computer") || computer_room >= 0.35) {
        int yaw = aik_open_cruise_yaw(wall);
        aik_set_decision_trace("enter-computer-room", "computer-room-route-cruise", 40, computer_room);
        return aik_action("forward", yaw, 0, g_profile.enable_strafe_run && yaw != 0, 0, 0);
    }

    if (strcmp(state->context, "open-space") == 0 || safe_zone >= 0.6) {
        int yaw = aik_open_cruise_yaw(wall);
        aik_set_decision_trace("reach-bridge", "open-space-cruise", 20, aik_weighted_evidence(safe_zone, 0.20, bridge, 0.25));
        return aik_action("forward", yaw, 0, g_profile.enable_strafe_run && yaw != 0, 0, 0);
    }

    aik_set_decision_trace("open-door", "wall-follow-fallback", 0, aik_weighted_evidence(corridor, 0.30, door, 0.20));
    return aik_action("forward", aik_wall_away_yaw(wall), 0, 1, 0, 0);
}

static int aik_write_action_json(uint8_t *buffer, int capacity, const aik_autoplay_action_t *action)
{
    int written = snprintf(
        (char *)buffer,
        (size_t)capacity,
        "{\"move\":\"%s\",\"turn\":\"%s\",\"fire\":%s,\"strafe\":%s,\"use\":%s,\"run\":%s,\"source\":\"wasm\",\"pipeline\":\"%s\",\"stage\":\"%s\",\"objective\":\"%s\",\"strategyPriority\":%d,\"evidenceScore\":%.3f,\"semanticScores\":{\"door\":%.3f,\"corridor\":%.3f,\"enemy\":%.3f,\"safe-zone\":%.3f,\"bridge\":%.3f,\"computer-room\":%.3f},\"ctgCarrier\":{\"gateExecuted\":%s,\"gateDecision\":{\"decision\":\"%s\",\"reasonCode\":\"%s\",\"approvals\":%d,\"rejects\":%d,\"abstentions\":%d,\"quorum\":%d,\"enforceGate\":%s,\"traceOnly\":%s,\"actionChangedByGate\":%s},\"councilDecisionTrace\":[{\"council\":\"Logos\",\"vote\":\"%s\",\"reasonCode\":\"%s\"},{\"council\":\"Ethos\",\"vote\":\"%s\",\"reasonCode\":\"%s\"},{\"council\":\"Pathos\",\"vote\":\"%s\",\"reasonCode\":\"%s\"}]}}",
        action->move,
        action->turn,
        action->fire ? "true" : "false",
        action->strafe ? "true" : "false",
        action->use ? "true" : "false",
        action->run ? "true" : "false",
        g_pipeline,
        g_pipeline,
        g_objective,
        g_strategy_priority,
        g_evidence_score,
        g_semantic_door,
        g_semantic_corridor,
        g_semantic_enemy,
        g_semantic_safe_zone,
        g_semantic_bridge,
        g_semantic_computer_room,
        g_ctg_gate_executed ? "true" : "false",
        g_ctg_decision,
        g_ctg_reason,
        g_ctg_approvals,
        g_ctg_rejects,
        g_ctg_abstentions,
        g_profile.ctg_quorum,
        g_profile.ctg_enforce_gate ? "true" : "false",
        g_profile.ctg_trace_only ? "true" : "false",
        g_ctg_action_changed ? "true" : "false",
        g_ctg_logos_vote,
        g_ctg_logos_reason,
        g_ctg_ethos_vote,
        g_ctg_ethos_reason,
        g_ctg_pathos_vote,
        g_ctg_pathos_reason);

    return written >= 0 && written < capacity ? written : -2;
}

int aik_autoplay_init(const uint8_t *profile_json, int profile_len)
{
    if (profile_json == 0 || profile_len <= 0) {
        snprintf(g_last_error, sizeof(g_last_error), "empty profile");
        return -1;
    }

    const char *json = (const char *)profile_json;
    aik_json_string(json, profile_len, "strategyName", "SeparatedDoorProbeStrafeRunnerV4", g_profile.strategy_name, (int)sizeof(g_profile.strategy_name));
    g_profile.door_aim_tolerance_degrees = (int)aik_json_number(json, profile_len, "doorAimToleranceDegrees", g_profile.door_aim_tolerance_degrees);
    g_profile.door_soft_aim_tolerance_degrees = (int)aik_json_number(json, profile_len, "doorSoftAimToleranceDegrees", g_profile.door_soft_aim_tolerance_degrees);
    g_profile.door_aim_yaw_degrees = (int)aik_json_number(json, profile_len, "doorAimYawDegrees", g_profile.door_aim_yaw_degrees);
    g_profile.emergency_stuck_ticks = (int)aik_json_number(json, profile_len, "emergencyStuckTicks", g_profile.emergency_stuck_ticks);
    g_profile.door_probe_stuck_ticks = (int)aik_json_number(json, profile_len, "doorProbeStuckTicks", g_profile.door_probe_stuck_ticks);
    g_profile.door_use_depth = aik_json_number(json, profile_len, "doorUseDepth", g_profile.door_use_depth);
    g_profile.blocked_depth = aik_json_number(json, profile_len, "blockedDepth", g_profile.blocked_depth);
    g_profile.combat_face_threshold = aik_json_number(json, profile_len, "combatFaceThreshold", g_profile.combat_face_threshold);
    g_profile.combat_yaw_degrees = (int)aik_json_number(json, profile_len, "combatYawDegrees", g_profile.combat_yaw_degrees);
    g_profile.low_health_threshold = (int)aik_json_number(json, profile_len, "lowHealthThreshold", g_profile.low_health_threshold);
    g_profile.emergency_escape_yaw_degrees = (int)aik_json_number(json, profile_len, "emergencyEscapeYawDegrees", g_profile.emergency_escape_yaw_degrees);
    g_profile.wall_away_yaw_degrees = (int)aik_json_number(json, profile_len, "wallAwayYawDegrees", g_profile.wall_away_yaw_degrees);
    g_profile.open_cruise_yaw_degrees = (int)aik_json_number(json, profile_len, "openCruiseYawDegrees", g_profile.open_cruise_yaw_degrees);
    g_profile.open_cruise_wall_vector_dead_zone = aik_json_number(json, profile_len, "openCruiseWallVectorDeadZone", g_profile.open_cruise_wall_vector_dead_zone);
    g_profile.enable_strafe_run = aik_json_bool(json, profile_len, "enableStrafeRun", g_profile.enable_strafe_run);
    g_profile.ctg_enable_trivalent_council = aik_json_bool(json, profile_len, "enableTrivalentCouncil", g_profile.ctg_enable_trivalent_council);
    g_profile.ctg_enforce_gate = aik_json_bool(json, profile_len, "enforceGate", g_profile.ctg_enforce_gate);
    g_profile.ctg_trace_only = aik_json_bool(json, profile_len, "traceOnly", g_profile.ctg_trace_only);
    g_profile.ctg_quorum = aik_clamp_int((int)aik_json_number(json, profile_len, "quorum", g_profile.ctg_quorum), 1, 3);
    g_profile.ctg_logos_approval_threshold = aik_clamp_double(aik_json_number(json, profile_len, "logosApprovalThreshold", g_profile.ctg_logos_approval_threshold), 0, 1);
    g_profile.ctg_ethos_reject_danger_threshold = aik_clamp_double(aik_json_number(json, profile_len, "ethosRejectDangerThreshold", g_profile.ctg_ethos_reject_danger_threshold), 0, 1);
    g_profile.ctg_pathos_reject_danger_threshold = aik_clamp_double(aik_json_number(json, profile_len, "pathosRejectDangerThreshold", g_profile.ctg_pathos_reject_danger_threshold), 0, 1);
    g_predictions = 0;
    g_last_error[0] = '\0';
    snprintf(g_pipeline, sizeof(g_pipeline), "initialized");
    snprintf(g_objective, sizeof(g_objective), "idle");
    g_strategy_priority = 0;
    g_evidence_score = 0;
    g_semantic_door = 0;
    g_semantic_corridor = 0;
    g_semantic_enemy = 0;
    g_semantic_safe_zone = 0;
    g_semantic_bridge = 0;
    g_semantic_computer_room = 0;
    aik_reset_ctg_trace();
    return 0;
}

int aik_autoplay_predict(const uint8_t *state_json, int state_len, uint8_t *action_json, int action_capacity)
{
    if (state_json == 0 || state_len <= 0 || action_json == 0 || action_capacity <= 0) {
        snprintf(g_last_error, sizeof(g_last_error), "invalid predict buffer");
        return -1;
    }

    const char *json = (const char *)state_json;
    aik_autoplay_state_t state;
    state.frame = (int)aik_json_number(json, state_len, "frame", 0);
    state.depth_sig = aik_json_number(json, state_len, "depthSig", aik_json_number(json, state_len, "depthEstimate", 1));
    state.health = (int)aik_json_number(json, state_len, "health", 100);
    state.face_sig = aik_json_number(json, state_len, "faceSig", 0);
    aik_json_string(json, state_len, "contextDict", "corridor", state.context, (int)sizeof(state.context));
    aik_json_string(json, state_len, "objective", "advance-route", state.objective, (int)sizeof(state.objective));
    state.sound_event = aik_json_bool(json, state_len, "soundEvent", aik_json_bool(json, state_len, "eventDetected", 0));
    state.stuck_ticks = (int)aik_json_number(json, state_len, "stuckTicks", 0);
    state.q_delta = (int)aik_json_number(json, state_len, "qDelta", 0);
    state.recovery_frames = (int)aik_json_number(json, state_len, "recoveryFrames", 0);
    state.wall_vector = aik_json_number(json, state_len, "wallVector", 0);
    state.door_confidence = aik_json_number(json, state_len, "doorConfidence", 0);
    state.corridor_confidence = aik_json_number(json, state_len, "corridorConfidence", 0);
    state.enemy_confidence = aik_json_number(json, state_len, "enemyConfidence", 0);
    state.safe_zone_confidence = aik_json_number(json, state_len, "safeZoneConfidence", 0);
    state.bridge_confidence = aik_json_number(json, state_len, "bridgeConfidence", 0);
    state.computer_room_confidence = aik_json_number(json, state_len, "computerRoomConfidence", 0);
    aik_read_sensor_tensor(json, state_len, &state);

    aik_autoplay_action_t action = aik_predict_action(&state);
    aik_apply_ctg_gate(&state, &action);
    g_predictions++;
    g_last_error[0] = '\0';
    return aik_write_action_json(action_json, action_capacity, &action);
}

int aik_autoplay_status(uint8_t *status_json, int status_capacity)
{
    if (status_json == 0 || status_capacity <= 0) {
        return -1;
    }

    int written = snprintf(
        (char *)status_json,
        (size_t)status_capacity,
        "{\"strategyName\":\"%s\",\"controller\":\"wasm\",\"controlPipeline\":\"%s\",\"stage\":\"%s\",\"objective\":\"%s\",\"strategyPriority\":%d,\"evidenceScore\":%.3f,\"semanticScores\":{\"door\":%.3f,\"corridor\":%.3f,\"enemy\":%.3f,\"safe-zone\":%.3f,\"bridge\":%.3f,\"computer-room\":%.3f},\"ctgCarrier\":{\"gateExecuted\":%s,\"gateDecision\":{\"decision\":\"%s\",\"reasonCode\":\"%s\",\"approvals\":%d,\"rejects\":%d,\"abstentions\":%d,\"quorum\":%d,\"enforceGate\":%s,\"traceOnly\":%s,\"actionChangedByGate\":%s},\"councilDecisionTrace\":[{\"council\":\"Logos\",\"vote\":\"%s\",\"reasonCode\":\"%s\"},{\"council\":\"Ethos\",\"vote\":\"%s\",\"reasonCode\":\"%s\"},{\"council\":\"Pathos\",\"vote\":\"%s\",\"reasonCode\":\"%s\"}]},\"predictions\":%u,\"lastLatencyMs\":0,\"lastError\":\"%s\",\"safetyReason\":\"none\"}",
        g_profile.strategy_name,
        g_pipeline,
        g_pipeline,
        g_objective,
        g_strategy_priority,
        g_evidence_score,
        g_semantic_door,
        g_semantic_corridor,
        g_semantic_enemy,
        g_semantic_safe_zone,
        g_semantic_bridge,
        g_semantic_computer_room,
        g_ctg_gate_executed ? "true" : "false",
        g_ctg_decision,
        g_ctg_reason,
        g_ctg_approvals,
        g_ctg_rejects,
        g_ctg_abstentions,
        g_profile.ctg_quorum,
        g_profile.ctg_enforce_gate ? "true" : "false",
        g_profile.ctg_trace_only ? "true" : "false",
        g_ctg_action_changed ? "true" : "false",
        g_ctg_logos_vote,
        g_ctg_logos_reason,
        g_ctg_ethos_vote,
        g_ctg_ethos_reason,
        g_ctg_pathos_vote,
        g_ctg_pathos_reason,
        g_predictions,
        g_last_error);

    return written >= 0 && written < status_capacity ? written : -2;
}
