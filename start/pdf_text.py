"""Restore Kanit alternate-glyph Unicode mappings omitted by Chromium/Skia.

Glyph appearance is unchanged. Map only null ToUnicode entries, using original
font glyph names, and fail rather than guess an unknown glyph.
"""
import re
import struct
from pypdf import PdfReader, PdfWriter

def glyph_names(font_path):
    data=font_path.read_bytes()
    tables={}
    for i in range(struct.unpack_from('>H',data,4)[0]):
        tag,_,offset,length=struct.unpack_from('>4sIII',data,12+16*i)
        tables[tag]=(offset,length)
    offset,length=tables[b'post']
    if struct.unpack_from('>I',data,offset)[0]!=0x20000:
        raise ValueError('Expected named glyphs in original Kanit font')
    count=struct.unpack_from('>H',data,offset+32)[0]
    indices=struct.unpack_from('>'+str(count)+'H',data,offset+34)
    pos=offset+34+2*count;extra=[]
    while pos<offset+length:
        size=data[pos];pos+=1;extra.append(data[pos:pos+size].decode('ascii'));pos+=size
    return [extra[i-258] if i>=258 else None for i in indices]

def unicode_for_glyph(name):
    base=name.split('.')[0] if name else ''
    if re.fullmatch(r'uni(?:[0-9A-Fa-f]{4})+',base):
        return ''.join(chr(int(base[i:i+4],16)) for i in range(3,len(base),4))
    compounds={'nikhahit_maiEkthai':'\u0e48\u0e4d','nikhahit_maiThothai':'\u0e49\u0e4d',
               'nikhahit_maiTrithai':'\u0e4a\u0e4d','nikhahit_maiChattawathai':'\u0e4b\u0e4d'}
    if base in compounds:return compounds[base]
    raise ValueError('Unknown missing Unicode glyph: '+str(name))

def repair_pdf(pdf_path, fonts_dir):
    reader=PdfReader(pdf_path);seen=set();changed=0
    for page in reader.pages:
        for ref in page['/Resources']['/Font'].values():
            font=ref.get_object()
            if id(font) in seen:continue
            seen.add(id(font))
            cmap=font['/ToUnicode'].get_object()
            mapping=cmap.get_data().decode('ascii')
            if not re.search(r'<[0-9A-Fa-f]{4}>\s+<0000>',mapping):continue
            base=str(font['/BaseFont']).split('+')[-1]
            if base not in {'Kanit-Regular','Kanit-SemiBold'}:raise ValueError('Unexpected font '+base)
            descendant=font['/DescendantFonts'][0].get_object()
            if descendant['/CIDToGIDMap']!='/Identity':raise ValueError('Expected original glyph IDs')
            names=glyph_names(fonts_dir/(base+'.ttf'))
            def replace(match):
                nonlocal changed
                glyph=int(match.group(1),16)
                value=unicode_for_glyph(names[glyph])
                changed+=1
                return '<'+match.group(1)+'> <'+value.encode('utf-16-be').hex().upper()+'>'
            cmap.set_data(re.sub(r'<([0-9A-Fa-f]{4})>\s+<0000>',replace,mapping).encode('ascii'))
    writer=PdfWriter();writer.clone_document_from_reader(reader)
    with pdf_path.open('wb') as stream:writer.write(stream)
    return changed
