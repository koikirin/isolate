import { Context, Schema } from 'koishi'

export const name = 'isolate'
export const filter = false
export const reusable = true
export const usage = '启用本插件将会以隔离模式启用本插件组内所有为启用插件，请勿手动操作其余插件，使用此插件同一开关。'

export interface Config {
  isolatedServices: string[]
}

export const Config: Schema<Config> = Schema.object({
  isolatedServices: Schema.array(String).role('table').description('要隔离的服务。').default([]),
})

const kRecord = Symbol.for('koishi.loader.record')

export function apply(_ctx: Context, _config: Config) {
  const config = _ctx.scope.parent.config
  const disabled = Object.keys(config).filter(key => key.startsWith('~') && !key.startsWith('~isolate:'))

  let ctx = _ctx
  _config.isolatedServices.forEach(name => ctx = ctx.isolate(name))
  ctx.scope[kRecord] = ctx.root.scope[kRecord]

  disabled.forEach(key => {
    _ctx.logger.info('apply isolated plugin %c', key.slice(1))
    ctx.loader.reload(ctx, key.slice(1), config[key])
  })
}
