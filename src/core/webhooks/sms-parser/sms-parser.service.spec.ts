import { Test, TestingModule } from '@nestjs/testing';
import { SmsParserService } from './sms-parser.service';
import { BadRequestException } from '@nestjs/common';

describe('SmsParserService', () => {
  let service: SmsParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsParserService],
    }).compile();

    service = module.get<SmsParserService>(SmsParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseTelebirrSms', () => {
    it('should successfully extract the amount and transaction ID from a valid Telebirr SMS', () => {
      const validSms = `Dear Adam \nYou have received ETB 10.00 from Wondale Begizaw(2519****3201)  on 14/08/2026 08:53:32. Your transaction number is DHE8RS6FT8. Your current E-Money Account balance is ETB 502.63.\nThank you for using telebirr\nEthio telecom`;

      const result = service.parseTelebirrSms(validSms);

      expect(result).toEqual({
        amount: '10.00',
        transactionId: 'DHE8RS6FT8',
      });
    });

    it('should throw BadRequestException if the SMS does not contain a valid amount', () => {
      const invalidSms = `Dear Adam \nYou have received money from someone. Your transaction number is DHE8RS6FT8.`;

      expect(() => service.parseTelebirrSms(invalidSms)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the SMS does not contain a valid transaction ID', () => {
      const invalidSms = `Dear Adam \nYou have received ETB 10.00 from Wondale Begizaw. Your current E-Money Account balance is ETB 502.63.`;

      expect(() => service.parseTelebirrSms(invalidSms)).toThrow(BadRequestException);
    });
  });
});
