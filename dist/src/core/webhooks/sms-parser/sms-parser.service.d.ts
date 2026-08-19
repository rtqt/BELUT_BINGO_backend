export declare class SmsParserService {
    parseTelebirrSms(smsText: string): {
        amount: string;
        transactionId: string;
    };
}
