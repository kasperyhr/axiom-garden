import { z } from "zod";

import {
  MAX_PROPERTIES_PER_RECORD,
  MAX_PROPERTY_ARRAY_LENGTH,
  MAX_PROPERTY_KEY_LENGTH,
  MAX_PROPERTY_STRING_LENGTH,
} from "../constants/limits";

const PROPERTY_KEY_PATTERN = /^(?!(?:__proto__|prototype|constructor)$)[A-Za-z][A-Za-z0-9._-]*$/u;

export const PropertyKeySchema = z
  .string()
  .min(1)
  .max(MAX_PROPERTY_KEY_LENGTH)
  .regex(PROPERTY_KEY_PATTERN, "Property key is unsafe or contains unsupported characters");

export const DomainPropertyScalarSchema = z.union([
  z.string().max(MAX_PROPERTY_STRING_LENGTH),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const DomainPropertyValueSchema = z.union([
  DomainPropertyScalarSchema,
  z.array(DomainPropertyScalarSchema).max(MAX_PROPERTY_ARRAY_LENGTH),
]);

export const DomainPropertiesSchema = z
  .record(PropertyKeySchema, DomainPropertyValueSchema)
  .refine((properties) => Object.keys(properties).length <= MAX_PROPERTIES_PER_RECORD, {
    message: `Properties must contain at most ${MAX_PROPERTIES_PER_RECORD} entries`,
  });

export type DomainPropertyScalar = z.infer<typeof DomainPropertyScalarSchema>;
export type DomainPropertyValue = z.infer<typeof DomainPropertyValueSchema>;
export type DomainProperties = z.infer<typeof DomainPropertiesSchema>;
