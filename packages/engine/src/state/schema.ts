import {
  CellRecordV1Schema,
  EntityV1Schema,
  GridV1Schema,
  LayerV1Schema,
  SymbolDefinitionV1Schema,
  WorldIdSchema,
  WorldMetadataV1Schema,
} from "@axiom-garden/domain";
import { z } from "zod";

import { CURRENT_SIMULATION_STATE_VERSION, MAX_TICK } from "../limits/constants";

export const SimulationStateV1Schema = z.strictObject({
  stateVersion: z.literal(CURRENT_SIMULATION_STATE_VERSION),
  sourceWorldId: WorldIdSchema,
  sourceSchemaVersion: z.literal(1),
  tick: z.int().nonnegative().max(MAX_TICK),
  metadata: WorldMetadataV1Schema,
  grid: GridV1Schema,
  symbols: z.array(SymbolDefinitionV1Schema),
  layers: z.array(LayerV1Schema),
  cells: z.array(CellRecordV1Schema),
  entities: z.array(EntityV1Schema),
});

export type SimulationStateV1 = z.infer<typeof SimulationStateV1Schema>;
