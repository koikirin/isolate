import { Context, isNullable, Schema } from 'koishi'
import { } from '@koishijs/plugin-proxy-agent'

export const name = 'isolate'
export const filter = false
export const reusable = true
export const usage = '启用本插件将会以隔离模式启用本插件组内所有未启用插件，请勿手动操作其余插件，使用此插件统一开关。'

export interface Config {
  isolatedServices: string[]
  proxyAgent?: string
}

export const Config: Schema<Config> = Schema.object({
  isolatedServices: Schema.array(String).role('table').description('要隔离的服务。').default([]),
  proxyAgent: Schema.string().description('代理地址。'),
})

const kRecord = Symbol.for('koishi.loader.record')

export function apply(_ctx: Context, _config: Config) {
  const config = _ctx.scope.parent.config
  const disabled = Object.keys(config).filter(key => key.startsWith('~') && !key.startsWith('~isolate:'))

  let ctx = isNullable(_config.proxyAgent) ? _ctx : _ctx.intercept('http', { proxyAgent: _config.proxyAgent })
  _config.isolatedServices.forEach(name => ctx = ctx.isolate(name))
  ctx.scope[kRecord] = Object.create(null)

  disabled.forEach(key => {
    _ctx.logger.info('apply isolated plugin %c', key.slice(1))
    const reload = () => ctx.loader.reload(ctx, key.slice(1), ctx.scope.parent.config[key]).then(fork => {
      return _ctx.scope.parent.scope[kRecord][key.slice(1)] = new Proxy(fork, {
        get(target, prop) {
          if (prop === 'dispose') {
            return async () => {
              await Promise.resolve()
              return reload()
            }
          }
          return Reflect.get(target, prop)
        },
      })
    })
    reload()
  })
}
