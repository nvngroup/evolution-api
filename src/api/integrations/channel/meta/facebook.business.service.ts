import { SendTextDto } from '@api/dto/sendMessage.dto';
import { ProviderFiles } from '@api/provider/sessions';
import { PrismaRepository } from '@api/repository/repository.service';
import { CacheService } from '@api/services/cache.service';
import { ChannelStartupService } from '@api/services/channel.service';
import { Events, wa } from '@api/types/wa.types';
import { ConfigService, MetaBusiness } from '@config/env.config';
import { InternalServerErrorException } from '@exceptions';
import { createJid } from '@utils/createJid';
import axios from 'axios';
import EventEmitter2 from 'eventemitter2';

export class FacebookBusinessStartupService extends ChannelStartupService {
  constructor(
    public readonly configService: ConfigService,
    public readonly eventEmitter: EventEmitter2,
    public readonly prismaRepository: PrismaRepository,
    public readonly cache: CacheService,
    public readonly chatwootCache: CacheService,
    public readonly baileysCache: CacheService,
    private readonly providerFiles: ProviderFiles,
  ) {
    super(configService, eventEmitter, prismaRepository, chatwootCache);
  }

  public stateConnection: wa.StateConnection = { state: 'open' };

  public phoneNumber: string;
  public mobile: boolean;

  public get connectionStatus() {
    return this.stateConnection;
  }

  public async closeClient() {
    this.stateConnection = { state: 'close' };
  }

  public get qrCode(): wa.QrCode {
    return {
      pairingCode: this.instance.qrcode?.pairingCode,
      code: this.instance.qrcode?.code,
      base64: this.instance.qrcode?.base64,
      count: this.instance.qrcode?.count,
    };
  }

  public async logoutInstance() {
    await this.closeClient();
  }

  private isMediaMessage(message: any) {
    return message.document || message.image || message.audio || message.video;
  }

  private async post(message: any, params: string) {
    try {
      let urlServer = this.configService.get<MetaBusiness>('META_BUSINESS').URL;
      const version = this.configService.get<MetaBusiness>('META_BUSINESS').VERSION;
      urlServer = `${urlServer}/${version}/${this.number}/${params}`;
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` };
      const result = await axios.post(urlServer, message, { headers });
      return result.data;
    } catch (e) {
      return e.response?.data?.error;
    }
  }

  public async profilePicture(number: string) {
    const jid = createJid(number);

    return {
      wuid: jid,
      profilePictureUrl: null,
    };
  }

  public async getProfileName() {
    return null;
  }

  public async profilePictureUrl() {
    return null;
  }

  public async getProfileStatus() {
    return null;
  }

  // Facebook-specific methods will be implemented here
  public async connectToWhatsapp(data?: any): Promise<any> {
    if (!data) {
      this.loadChatwoot();
      return;
    }

    try {
      this.eventHandler(data);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error?.toString());
    }
  }

  // Facebook Page messaging methods
  public async sendFacebookMessage(recipientId: string, message: any) {
    const messageData = {
      recipient: { id: recipientId },
      message: message,
    };

    return await this.post(messageData, 'messages');
  }

  public async sendFacebookText(data: SendTextDto) {
    const message = {
      text: data.text,
    };

    return await this.sendFacebookMessage(data.number, message);
  }

  // Event handler for Facebook webhooks
  private eventHandler(data: any) {
    // Handle Facebook webhook events
    if (data.object === 'page') {
      data.entry?.forEach((entry: any) => {
        const messaging = entry.messaging;
        if (messaging) {
          messaging.forEach((event: any) => {
            if (event.message) {
              this.handleFacebookMessage(event);
            } else if (event.postback) {
              this.handleFacebookPostback(event);
            }
          });
        }
      });
    }
  }

  private handleFacebookMessage(event: any) {
    // Process incoming Facebook message
    this.logger.info(`Facebook message received: ${JSON.stringify(event)}`);

    // Emit event for webhook processing
    this.sendDataWebhook(Events.MESSAGES_UPSERT, {
      instanceName: this.instanceName,
      data: [
        {
          key: {
            remoteJid: event.sender.id,
            fromMe: false,
            id: event.message.mid,
          },
          message: {
            conversation: event.message.text || '',
          },
          messageTimestamp: event.timestamp,
          source: 'facebook',
        },
      ],
    });
  }

  private handleFacebookPostback(event: any) {
    // Process Facebook postback (button clicks, etc.)
    this.logger.info(`Facebook postback received: ${JSON.stringify(event)}`);
  }
}
