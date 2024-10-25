
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["typeorm"],
    optimizeCss: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      const CssMinimizerPlugin = import('css-minimizer-webpack-plugin');
      const PurgeCSSPlugin = import('purgecss-webpack-plugin');
      const glob = import('glob');
      const path = import('path');

      config.plugins.push(
        new PurgeCSSPlugin({
          paths: glob.sync(`${path.join(process.cwd(), 'src')}/**/*`, { 
            nodir: true 
          }),
          safelist: {
            standard: [
              'html', 
              'body',
              /^next-/,
              // Common dynamic state classes
              /-active$/,
              /-disabled$/,
              /-open$/,
              /-closed$/,
              // Handle numeric modifiers
              /-\d+$/,
              /\[\d+\]/,
            ],
            deep: [
              // Common UI library patterns
              /^modal/,
              /^drawer/,
              /^dialog/,
              /^tooltip/,
              // Dynamic state classes
              /\.open$/,
              /\.active$/,
              /\.selected$/,
              /\.disabled$/,
              // Data attributes
              /data-\[.*\]/,
            ],
            greedy: [
              // Common UI library prefixes
              /^ReactModal/,
              /^rc-/,
              /^mui-/,
              /^ant-/,
            ]
          },
          // Enhanced extractor for dynamic classes
          defaultExtractor: (content) => {
            const extractedClasses = new Set();
            
            // Basic classes
            const standardClasses = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
            standardClasses.forEach(cls => extractedClasses.add(cls));
            
            // Template literals
            const templateLiterals = content.match(/\${[^}]*}/g) || [];
            templateLiterals.forEach(literal => {
              const matches = literal.match(/['"`](.*?)['"`]/g) || [];
              matches.forEach(m => extractedClasses.add(m.slice(1, -1)));
            });
            
            // Conditional classes
            const conditionals = content.match(/className={\s*(?:.*\s*\?.*:.*|\`.*\`)\s*}/g) || [];
            conditionals.forEach(conditional => {
              const matches = conditional.match(/['"`](.*?)['"`]/g) || [];
              matches.forEach(m => extractedClasses.add(m.slice(1, -1)));
            });
            
            // clsx/classnames utility usage
            const utilityClasses = content.match(/(?:cx|classnames)\((.*?)\)/gs) || [];
            utilityClasses.forEach(utility => {
              const matches = utility.match(/['"`](.*?)['"`]/g) || [];
              matches.forEach(m => extractedClasses.add(m.slice(1, -1)));
            });
            
            return Array.from(extractedClasses);
          },
          variables: true,
          keyframes: true,
          fontFace: true,
        })
      );

      config.optimization.minimizer.push(new CssMinimizerPlugin());
    }

    return config;
  }
};

export default nextConfig;