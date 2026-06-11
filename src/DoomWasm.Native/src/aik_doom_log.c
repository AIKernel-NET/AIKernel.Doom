#include "aik_doom_abi.h"

#include <stdio.h>

void aik_doom_log(const char *message)
{
    if (message == 0) {
        return;
    }

    fputs("[AIKernel.Doom.Native] ", stderr);
    fputs(message, stderr);
    fputc('\n', stderr);
}
