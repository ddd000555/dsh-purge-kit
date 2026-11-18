# dsh-purge-kit

Execution-policy layer for **DSH** (cordis runtime), including **DSH Go** on Android.

Installing the package is the whole install: the bundle patch registers the plugin
itself, so there is no second step and no edit to `<profile>/cordis.patch.yml`.
Restart the engine and it is live.

```sh
dsh plugin add dsh-purge-kit          # or the plugin page: 添加插件 → dsh-purge-kit
# restart the engine
purgekit-doctor                       # or: node bin/doctor.mjs --home ~/.dsh --profile web
```

## What it does

| Layer | API | Effect |
|---|---|---|
| Reply profile | `systemPrompt.section` × 3 | delivery profile applied to every turn |
| Runtime hint | `systemPrompt.context` | states the active gate mode |
| Tool gate | `approval/request` waterfall (prepended) | resolves at the first hop; the host decider never runs |
| Assembly | `system-prompt/assemble` waterfall | folds profile blocks into the primary block, rewrites stale gate sentences |
| Transcript | `agent/pre-step` | keeps injected notices out of history |

Every hook is wrapped: a throw is logged and swallowed, so a bad config degrades
to a normal boot instead of a dead engine.

Nothing under `@deepseek-ai/*` is opened, rewritten or patched.

## Why the install always lands

`dsh.profile.bundles` entries are resolved to their `dsh.bundle.patch` layers
first, then the profile's own `cordis.patch.yml` applies on top. This package's
patch file is therefore both a host tweak **and** a self-registration:

```yaml
- id: system-prompt
  config:
    includeHarnessIdentity: false
    personaPrefix: ""
    personaSuffix: ""

- insert:
    - id: dsh-purge-kit
      name: dsh-purge-kit
      config: { enabled: true, tone: true, tools: true, tail: true, toolGate: true, normalize: true }
```

The `insert` row is what puts the plugin into the loader entry list. Without it a
package sits in `node_modules` and `bundles` but is never instantiated — that is
the single most common reason a DSH plugin "installs but does nothing".

## Config

All keys optional, set them in the `config:` block above:

| key | default | meaning |
|---|---|---|
| `enabled` | `true` | master switch |
| `tone` | `true` | compose the reply-profile block |
| `tools` | `true` | compose the tool-protocol block |
| `tail` | `true` | compose the closing anchor block |
| `toolGate` | `true` | resolve the tool gate at the first hop |
| `normalize` | `true` | rewrite stale host gate sentences during assembly |

## Verify

```sh
purgekit-doctor                                  # global command after install
node bin/doctor.mjs --home /root/.dsh --profile web
```

```
 OK  package        .../node_modules/dsh-purge-kit
 OK  bundles        ..., dsh-purge-kit
 OK  self-register  bundle patch inserts dsh-purge-kit
 OK  loaded         version 1.0.0 @ 2026-..-..T..
 OK  hooks          {"sections":3,"contexts":1,"gate":true,"assembly":true,"prestep":true}
```

`loaded` missing means the engine has not been restarted since install.

## Uninstall

Remove it in the plugin page, or delete the entry from `dsh.profile.bundles` and
restart. Both the plugin row and the host tweak disappear with the bundle.

## Compatibility

- DSH engine `0.2.2-rc.1` and later; Node 20+
- Any cordis profile exposing `systemPrompt.section` / `.context`
- Android DSH Go: paths resolve from `$DSH_HOME`, `~/.dsh`, `/root/.dsh`

## License

MIT
