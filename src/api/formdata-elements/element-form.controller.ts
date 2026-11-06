import type { Request, Response } from 'express';
import * as elementFormService from './element-form.service';
import type { FormLinkInput, FormLinkUpdateInput } from './element-form.schemas';

type ElementParams = { elementId: string };
type LinkParams = { elementId: string; linkId: string };

export const addFormField = async (
  req: Request<ElementParams, unknown, FormLinkInput>,
  res: Response,
): Promise<void> => {
  const link = await elementFormService.addFormFieldToElement(
    parseInt(req.params.elementId, 10),
    req.body,
  );
  res.status(201).json(link);
};

export const getFormFields = async (req: Request<ElementParams>, res: Response): Promise<void> => {
  const fields = await elementFormService.getFormFieldsForElement(
    parseInt(req.params.elementId, 10),
  );
  res.status(200).json(fields);
};

// El vínculo se identifica solo por su id (el elementId de la ruta no se comprueba, como hoy).
export const updateFormField = async (
  req: Request<LinkParams, unknown, FormLinkUpdateInput>,
  res: Response,
): Promise<void> => {
  const link = await elementFormService.updateFormField(parseInt(req.params.linkId, 10), req.body);
  res.status(200).json(link);
};

export const removeFormField = async (req: Request<LinkParams>, res: Response): Promise<void> => {
  await elementFormService.removeFormField(parseInt(req.params.linkId, 10));
  res.status(204).send();
};

export const updateFormFields = async (
  req: Request<ElementParams, unknown, FormLinkInput[]>,
  res: Response,
): Promise<void> => {
  const updatedFields = await elementFormService.updateFormFieldsInBulk(
    parseInt(req.params.elementId, 10),
    req.body,
  );
  res.status(200).json(updatedFields);
};
