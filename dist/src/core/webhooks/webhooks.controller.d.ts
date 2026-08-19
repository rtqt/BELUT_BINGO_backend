import { SmsParserService } from './sms-parser/sms-parser.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class WebhooksController {
    private readonly smsParser;
    private readonly prisma;
    constructor(smsParser: SmsParserService, prisma: PrismaService);
    handleTelebirrSms(payload: {
        smsText: string;
    }): Promise<{
        success: boolean;
        transactionId: string;
        message?: undefined;
        error?: undefined;
        stack?: undefined;
        code?: undefined;
    } | {
        success: boolean;
        message: string;
        transactionId?: undefined;
        error?: undefined;
        stack?: undefined;
        code?: undefined;
    } | {
        success: boolean;
        error: any;
        stack: any;
        code: any;
        transactionId?: undefined;
        message?: undefined;
    }>;
}
