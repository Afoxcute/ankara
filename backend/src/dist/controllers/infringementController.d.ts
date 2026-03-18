import { Request, Response } from 'express';
declare const handleInfringementStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const handleInfringementStatusByContract: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { handleInfringementStatus, handleInfringementStatusByContract };
//# sourceMappingURL=infringementController.d.ts.map