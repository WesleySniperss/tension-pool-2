import { MODULE_ID } from "./constants.js";

const FOLDER_NAME = "VTools Tension Pool (Examples)";

interface MacroDef {
  name: string;
  command: string;
}

const MACROS: MacroDef[] = [
  {
    name: "TP: Add Die",
    command: `game.modules.get("${MODULE_ID}")?.api?.add();`,
  },
  {
    name: "TP: Remove Die",
    command: `game.modules.get("${MODULE_ID}")?.api?.remove();`,
  },
  {
    name: "TP: Add (3)",
    command: `game.modules.get("${MODULE_ID}")?.api?.add(3);`,
  },
  {
    name: "TP: Remove (2)",
    command: `game.modules.get("${MODULE_ID}")?.api?.remove(2);`,
  },
  {
    name: "TP: Roll Pool",
    command: `game.modules.get("${MODULE_ID}")?.api?.roll();`,
  },
  {
    name: "TP: Clear Pool",
    command: `game.modules.get("${MODULE_ID}")?.api?.clear();`,
  },
  {
    name: "TP: Custom Roll (4)",
    command: `game.modules.get("${MODULE_ID}")?.api?.customRoll(4);`,
  },
  {
    name: "TP: Get Dice Count",
    command: `const count = game.modules.get("${MODULE_ID}")?.api?.getDiceCount();
ui.notifications.info("Dice count: " + count);`,
  },
  {
    name: "TP: Get Pool Size",
    command: `const size = game.modules.get("${MODULE_ID}")?.api?.getPoolSize();
ui.notifications.info("Pool size: " + size);`,
  },
];

function findFolder(): any {
  return (game as Game).folders!.find(
    (f: any) => f.name === FOLDER_NAME && f.type === "Macro"
  );
}

export async function syncExampleMacros(): Promise<void> {
  const g = game as Game;

  let folder = findFolder() as any;
  if (!folder) {
    folder = await (Folder as any).create({
      name: FOLDER_NAME,
      type: "Macro",
      sorting: "a",
    });
  }

  // Delete existing macros in the folder and recreate fresh
  const existing = g.macros!.filter((m: any) => m.folder?.id === folder.id);
  if (existing.length > 0) {
    const ids = existing.map((m: any) => m.id);
    await (Macro as any).deleteDocuments(ids);
  }

  const createData = MACROS.map((def) => ({
    name: def.name,
    type: "script",
    scope: "global",
    command: def.command,
    folder: folder.id,
  }));
  await (Macro as any).createDocuments(createData);

  console.log(`VTools Tension Pool | Example macros installed in "${FOLDER_NAME}"`);
}

export async function deleteExampleMacros(): Promise<void> {
  const g = game as Game;
  const folder = findFolder() as any;
  if (!folder) return;

  const existing = g.macros!.filter((m: any) => m.folder?.id === folder.id);
  if (existing.length > 0) {
    const ids = existing.map((m: any) => m.id);
    await (Macro as any).deleteDocuments(ids);
  }

  await folder.delete();
  console.log(`VTools Tension Pool | Example macros removed`);
}
