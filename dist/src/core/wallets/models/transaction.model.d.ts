export declare class Transaction {
    id: string;
    walletId: string;
    type: string;
    amount: number;
    status: string;
    balanceAfter?: number;
    externalTxId?: string;
    isClaimed: boolean;
    createdAt: Date;
}
