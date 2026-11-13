import { parseCsv, toCsv } from './csv';

const BOM = String.fromCharCode(0xfeff);

describe('toCsv', () => {
  it('writes a BOM, semicolons and CRLF and quotes only when needed', () => {
    expect(
      toCsv([
        ['Fecha', 'Descripción'],
        ['2026-11-02', 'Cena; "La Tasca"'],
      ]),
    ).toBe(`${BOM}Fecha;Descripción\r\n2026-11-02;"Cena; ""La Tasca"""\r\n`);
  });

  it('defuses spreadsheet formulas but keeps negative numbers', () => {
    expect(toCsv([['=SUM(A1)', '-12,50', '@user']])).toBe(`${BOM}'=SUM(A1);-12,50;'@user\r\n`);
  });
});

describe('parseCsv', () => {
  it('reads its own output back', () => {
    const rows = [
      ['Fecha', 'Descripción'],
      ['2026-11-02', 'Línea 1\nLínea 2; "x"'],
    ];

    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('detects commas and tabs and skips blank lines', () => {
    expect(parseCsv('date,amount\n\n2026-11-02,"1,50"\n')).toEqual([
      ['date', 'amount'],
      ['2026-11-02', '1,50'],
    ]);
    expect(parseCsv('a\tb\r\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});
