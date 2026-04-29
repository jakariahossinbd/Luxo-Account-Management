import localFont from 'next/font/local';

export const poppinsFont = localFont({
  variable: '--font-poppins',
  display: 'swap',
  src: [
    { path: '../../font/poppins/Poppins-Thin.ttf', weight: '100', style: 'normal' },
    { path: '../../font/poppins/Poppins-ThinItalic.ttf', weight: '100', style: 'italic' },
    { path: '../../font/poppins/Poppins-ExtraLight.ttf', weight: '200', style: 'normal' },
    { path: '../../font/poppins/Poppins-ExtraLightItalic.ttf', weight: '200', style: 'italic' },
    { path: '../../font/poppins/Poppins-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../font/poppins/Poppins-LightItalic.ttf', weight: '300', style: 'italic' },
    { path: '../../font/poppins/Poppins-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../font/poppins/Poppins-Italic.ttf', weight: '400', style: 'italic' },
    { path: '../../font/poppins/Poppins-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../font/poppins/Poppins-MediumItalic.ttf', weight: '500', style: 'italic' },
    { path: '../../font/poppins/Poppins-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../font/poppins/Poppins-SemiBoldItalic.ttf', weight: '600', style: 'italic' },
    { path: '../../font/poppins/Poppins-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../font/poppins/Poppins-BoldItalic.ttf', weight: '700', style: 'italic' },
    { path: '../../font/poppins/Poppins-ExtraBold.ttf', weight: '800', style: 'normal' },
    { path: '../../font/poppins/Poppins-ExtraBoldItalic.ttf', weight: '800', style: 'italic' },
    { path: '../../font/poppins/Poppins-Black.ttf', weight: '900', style: 'normal' },
    { path: '../../font/poppins/Poppins-BlackItalic.ttf', weight: '900', style: 'italic' },
  ],
});

export const linoirritFont = localFont({
  variable: '--font-linoirrit',
  display: 'swap',
  src: [
    { path: '../../font/linoirrit/Li Ador Noirrit ExtraLight.ttf', weight: '200', style: 'normal' },
    { path: '../../font/linoirrit/Li Ador Noirrit ExtraLight Italic.ttf', weight: '200', style: 'italic' },
    { path: '../../font/linoirrit/Li Ador Noirrit Light.ttf', weight: '300', style: 'normal' },
    { path: '../../font/linoirrit/Li Ador Noirrit Light Italic.ttf', weight: '300', style: 'italic' },
    { path: '../../font/linoirrit/Li Ador Noirrit Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../font/linoirrit/Li Ador Noirrit Italic.ttf', weight: '400', style: 'italic' },
    { path: '../../font/linoirrit/Li Ador Noirrit SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../font/linoirrit/Li Ador Noirrit SemiBold Italic.ttf', weight: '600', style: 'italic' },
    { path: '../../font/linoirrit/Li Ador Noirrit Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../font/linoirrit/Li Ador Noirrit Bold Italic.ttf', weight: '700', style: 'italic' },
  ],
});