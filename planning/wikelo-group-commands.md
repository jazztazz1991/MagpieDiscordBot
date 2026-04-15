# Discord Bot: Wikelo Group Commands

## Context

The Magpie Industries website (`https://magpie-api.onrender.com`) now has shared Wikelo project groups. The API endpoints for the bot are already built. The existing `/wikelo` command in `src/commands/wikelo.ts` handles personal projects (link, add, status, projects, wake). We need to add group subcommands.

## API Endpoints Available

All endpoints require `Authorization: Bot {MAGPIE_BOT_SECRET}` header.

**Group Management:**
- `GET /api/discord-bot/groups/:discordId` — list user's groups → `{ data: [{ id, name, inviteCode, memberCount, projectCount }] }`
- `POST /api/discord-bot/groups/create` — body: `{ discordId, name }` → `{ data: { id, name, inviteCode } }`
- `POST /api/discord-bot/groups/join` — body: `{ discordId, inviteCode }` → `{ data: { groupId, groupName } }`

**Group Shopping List & Items:**
- `GET /api/discord-bot/groups/:groupId/shopping-list/:discordId` → `{ data: { projectCount, overallProgress, totalRemaining, items: [{ name, needed, collected, remaining }] } }`
- `POST /api/discord-bot/groups/:groupId/add-items` — body: `{ discordId, itemName, quantity }` → `{ data: { updated, totalAdded, updates: [{ projectName, itemName, oldCount, newCount }] } }`

## Commands to Add

Update the existing `/wikelo` command in `src/commands/wikelo.ts` to add these subcommands:

### `/wikelo group create <name>`
- Calls `POST /api/discord-bot/groups/create` with `{ discordId, name }`
- Reply with embed showing group name + invite code
- Tell user to share the invite code

### `/wikelo group join <code>`
- Calls `POST /api/discord-bot/groups/join` with `{ discordId, inviteCode }`
- Reply with success/already member message

### `/wikelo group list`
- Calls `GET /api/discord-bot/groups/:discordId`
- Reply with embed listing all groups (name, member count, project count, invite code)

### `/wikelo group status [group_name]`
- If group_name provided, find matching group from user's groups list
- If only 1 group, use that one automatically
- Calls `GET /api/discord-bot/groups/:groupId/shopping-list/:discordId`
- Reply with full shopping list embed (same format as personal `/wikelo status` but for the group)
- Show all items, no truncation — use multi-embed if needed

### `/wikelo group add <item> <quantity> [group_name]`
- Same group resolution as status
- Calls `POST /api/discord-bot/groups/:groupId/add-items` with `{ discordId, itemName, quantity }`
- Reply with embed showing what was added and to which project

## Implementation Notes

1. Discord.js slash commands support subcommand groups: `/wikelo group create`, `/wikelo group join`, etc. Use `.addSubcommandGroup()` on the existing command builder.

2. The existing `apiCall()` helper in `wikelo.ts` already handles auth headers — reuse it.

3. For group resolution (when `group_name` is optional): fetch the user's groups first, then either match by name or use the only group if there's just one. If multiple groups and no name specified, ask the user to specify.

4. The `/wikelo status` and `/wikelo add` commands should stay as personal-only. Group equivalents are under `/wikelo group status` and `/wikelo group add`.

5. All existing subcommands (link, add, status, projects, wake) should remain unchanged.

6. After adding commands, run `npm run deploy-commands` to register them with Discord.

## Environment Variables Needed
Already in `.env`:
- `MAGPIE_API_URL` — API base URL
- `MAGPIE_BOT_SECRET` — shared auth secret
