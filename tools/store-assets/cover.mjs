// Repository-only cover artwork; never packaged with the extension.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=new URL('../../',import.meta.url),file=p=>new URL(p,root);
const hash=b=>createHash('sha256').update(b).digest('hex');
const icon=await readFile(file('icons/parker-timer.svg'),'utf8');
const shapes=icon.slice(icon.indexOf('<g '),icon.lastIndexOf('</svg>'));
const source=`<svg xmlns="http://www.w3.org/2000/svg" width="3200" height="800" viewBox="0 0 1600 400">
<title>Small tools, thoughtfully made. Chrome Window Parker.</title>
<desc>A pale blue developer banner with generous space, a blue timer and subtle layered windows. Text remains inside the central safe area.</desc>
<rect width="1600" height="400" fill="#edf2f9"/>
<g fill="none" stroke="#d7e1f0" stroke-width="1.5">
<rect x="1044" y="60" width="288" height="230" rx="18"/>
<rect x="1026" y="78" width="288" height="230" rx="18"/>
</g>
<rect x="1008" y="96" width="288" height="230" rx="18" fill="#fafcfe" stroke="#d7e1f0" stroke-width="1.5"/>
<path d="M1009 132H1295" stroke="#e1e8f3" stroke-width="1.5"/>
<g fill="#c8d5e8"><circle cx="1027" cy="114" r="3"/><circle cx="1038" cy="114" r="3"/><circle cx="1049" cy="114" r="3"/></g>
<svg x="1088" y="146" width="128" height="128" viewBox="0 0 128 128">${shapes}</svg>
<g font-family="Arial, Helvetica, sans-serif">
<text x="260" y="172" font-size="42" font-weight="700" letter-spacing="-1.2" fill="#172a48">Small tools, thoughtfully made.</text>
<rect x="260" y="204" width="40" height="3" rx="1.5" fill="#2b60c5"/>
<text x="260" y="251" font-size="25" font-weight="500" fill="#2b60c5">Chrome Window Parker</text>
</g>
</svg>\n`;
await mkdir(file('docs/assets/sources/'),{recursive:true});
const sourcePath='docs/assets/sources/buy-me-a-coffee-cover.svg',masterPath='docs/assets/sources/buy-me-a-coffee-cover-3200x800.png',finalPath='docs/assets/buy-me-a-coffee-cover-1600x400.png';
await writeFile(file(sourcePath),source);
const master=await sharp(Buffer.from(source)).flatten({background:'#edf2f9'}).toColourspace('srgb').png().toBuffer();
await writeFile(file(masterPath),master);
const final=await sharp(master).resize(1600,400,{kernel:'lanczos3'}).toColourspace('srgb').png().toBuffer();
await writeFile(file(finalPath),final);
await writeFile(file('docs/assets/sources/buy-me-a-coffee-cover.json'),JSON.stringify({source:sourcePath,sourceSHA256:hash(Buffer.from(source)),master:masterPath,masterWidth:3200,masterHeight:800,masterSHA256:hash(master),output:finalPath,width:1600,height:400,outputSHA256:hash(final),icon:'icons/parker-timer.svg',iconSHA256:hash(icon),renderer:'SVG vector and system text at 2x; one Lanczos3 downsample; RGB sRGB PNG',safeArea:'Headline and project name between x=260 and x=950; essential icon between x=1088 and x=1216; all essential content within central 70% width and y=130..275.'},null,2)+'\n');
console.log(`${finalPath}: 1600×400 PNG; retained 3200×800 PNG and SVG master`);
