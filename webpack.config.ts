import { type Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import path from 'path';
import grafanaConfig, { Env } from './.config/webpack/webpack.config';

const config = async (env: Env): Promise<Configuration> => {
    const baseConfig = await grafanaConfig(env);
    return merge(baseConfig, {
        resolve: {
            alias: {
                "@": path.resolve(process.cwd(), 'src/')
            }
        }
    });
};

export default config;
