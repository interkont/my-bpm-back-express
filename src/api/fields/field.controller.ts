import type { Request, Response } from 'express';
import * as fieldService from './field.service';
import { FIELD_TYPES } from './field.catalog';
import type { FieldCreateInput, FieldUpdateInput } from './field.schemas';

export const getFieldTypes = (_req: Request, res: Response): void => {
  res.status(200).json(FIELD_TYPES);
};

export const createField = async (
  req: Request<object, unknown, FieldCreateInput>,
  res: Response,
): Promise<void> => {
  const field = await fieldService.createField(req.body);
  res.status(201).json(field);
};

export const getFields = async (_req: Request, res: Response): Promise<void> => {
  const fields = await fieldService.getFields();
  res.status(200).json(fields);
};

export const getField = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const field = await fieldService.getFieldById(parseInt(req.params.id, 10));
  res.status(200).json(field);
};

export const updateField = async (
  req: Request<{ id: string }, unknown, FieldUpdateInput>,
  res: Response,
): Promise<void> => {
  const field = await fieldService.updateField(parseInt(req.params.id, 10), req.body);
  res.status(200).json(field);
};

export const deleteField = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await fieldService.deleteField(parseInt(req.params.id, 10));
  res.status(204).send();
};
