# CLI

Run:

```powershell
dotnet run --project src/DoomDemo/DoomDemo.csproj
```

The demo shows an AIKernel boot-style prompt and then suspends on user approval:

- terms of use consent
- approximately 300MB runtime data download/cache consent
- Bonsai-1.7B model acquisition consent
- DOOM WASM app load consent

The approval hint word is:

```text
yes
```

Typing `yes`, `y`, `approve`, or `aik approve doom.runtime-download` records consent and resumes preparation. Typing `no` keeps the runtime suspended.

Commands:

```text
yes
aik help
aik help commands
aik help approval
aik help doom
aik status
aik providers list
aik capabilities list
aik exec run doom
aik capabilities invoke doom.start
aik capabilities invoke doom.stop
aik capabilities invoke doom.status
clear
help
exit
quit
```

Unknown commands fail closed and print safe suggestions.
