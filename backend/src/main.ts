import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import compression from 'compression'
import * as path from 'path'

import { AppModule } from './app.module'

async function bootstrap () {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get(ConfigService)

  const apiPrefix = config.get<string>('apiPrefix') ?? 'api/v1'
  app.setGlobalPrefix(apiPrefix)

  app.use(helmet())
  app.use(compression())
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads/' })
  app.enableCors({ origin: config.get<string>('corsOrigin'), credentials: true })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  if (config.get<boolean>('swaggerEnabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Condominium Platform API')
      .setDescription('SaaS multi-tenant para administración de condominios')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('docs', app, document)
  }

  const port = config.get<number>('port') ?? 3000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}/${apiPrefix}`)
  console.log(`Swagger: http://localhost:${port}/docs`)
}

bootstrap()
