import { RouterBroker } from '@api/abstract/abstract.router';
import { metaController } from '@api/server.module';
import { ConfigService, MetaBusiness, WaBusiness } from '@config/env.config';
import { Router } from 'express';

export class MetaRouter extends RouterBroker {
  constructor(readonly configService: ConfigService) {
    super();
    this.router
      // WhatsApp Business webhook (existing)
      .get(this.routerPath('webhook/meta', false), async (req, res) => {
        if (req.query['hub.verify_token'] === configService.get<WaBusiness>('WA_BUSINESS').TOKEN_WEBHOOK)
          res.send(req.query['hub.challenge']);
        else res.send('Error, wrong validation token');
      })
      .post(this.routerPath('webhook/meta', false), async (req, res) => {
        const { body } = req;
        const response = await metaController.receiveWebhook(body);

        return res.status(200).json(response);
      })

      // Facebook Business webhook
      .get(this.routerPath('webhook/facebook', false), async (req, res) => {
        const metaBusiness = configService.get<MetaBusiness>('META_BUSINESS');
        if (req.query['hub.verify_token'] === metaBusiness.TOKEN_WEBHOOK) res.send(req.query['hub.challenge']);
        else res.send('Error, wrong validation token');
      })
      .post(this.routerPath('webhook/facebook', false), async (req, res) => {
        const { body } = req;
        const response = await metaController.receiveFacebookWebhook(body);

        return res.status(200).json(response);
      })

      // Instagram Business webhook
      .get(this.routerPath('webhook/instagram', false), async (req, res) => {
        const metaBusiness = configService.get<MetaBusiness>('META_BUSINESS');
        if (req.query['hub.verify_token'] === metaBusiness.TOKEN_WEBHOOK) res.send(req.query['hub.challenge']);
        else res.send('Error, wrong validation token');
      })
      .post(this.routerPath('webhook/instagram', false), async (req, res) => {
        const { body } = req;
        const response = await metaController.receiveInstagramWebhook(body);

        return res.status(200).json(response);
      });
  }

  public readonly router: Router = Router();
}
