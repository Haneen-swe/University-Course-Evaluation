import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './users.schema';

export const usersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.list(req.query as UserQueryDto);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.findById(req.user!.id);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.findById(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.create(
        req.body as CreateUserDto,
        req.user!.id,
        req.ip ?? 'unknown'
      );
      res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.update(
        req.params.id,
        req.body as UpdateUserDto,
        req.user!.id,
        req.ip ?? 'unknown'
      );
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.softDelete(req.params.id, req.user!.id, req.ip ?? 'unknown');
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
