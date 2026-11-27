import type { AppData, Effort, Project, Status } from './types';

let n = 0;
function p(
  id: string,
  title: string,
  room: string,
  status: Status,
  effort: Effort,
  impact: number,
  cost: [number, number] | undefined,
  deps: [string, 'hard' | 'soft'][] = [],
  extra: Partial<Project> = {},
): Project {
  const now = Date.now() - (100 - n++) * 3600_000;
  return {
    id,
    title,
    room,
    status,
    effort,
    impact,
    costMin: cost?.[0],
    costMax: cost?.[1],
    deps: deps.map(([d, kind]) => ({ id: d, kind })),
    quotes: [],
    steps: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...(status === 'klaar' ? { completedAt: now } : {}),
    ...extra,
  };
}

export function sampleData(): AppData {
  const list: Project[] = [
    p('s-leiding', 'Leidingwerk badkamer', 'Badkamer', 'klaar', 'L', 4, [900, 1400], [], { actualCost: 1150, doer: 'vakman' }),
    p('s-ventilatie', 'Badkamer ventilatie', 'Badkamer', 'open', 'S', 3, [150, 300], [['s-leiding', 'hard']]),
    p('s-tegels', 'Badkamer betegelen', 'Badkamer', 'open', 'L', 5, [1800, 2600], [['s-leiding', 'hard'], ['s-ventilatie', 'soft']], {
      doer: 'vakman',
      quotes: [
        { id: 'q1', party: 'Tegelzetter De Vries', amount: 2150 },
        { id: 'q2', party: 'Badkamerstudio Noord', amount: 2480 },
      ],
      steps: [
        { id: 'st1', title: 'Tegels uitkiezen', done: true },
        { id: 'st2', title: 'Offertes opvragen', done: true },
        { id: 'st3', title: 'Tegelzetter kiezen', done: false },
        { id: 'st4', title: 'Oude tegels verwijderen', done: false },
        { id: 'st5', title: 'Betegelen en voegen', done: false },
      ],
    }),
    p('s-douche', 'Inloopdouche plaatsen', 'Badkamer', 'open', 'L', 5, [600, 1300], [['s-tegels', 'hard']]),
    p('s-meubel', 'Badkamermeubel ophangen', 'Badkamer', 'open', 'S', 3, [80, 150], [['s-tegels', 'hard']]),
    p('s-zolder-iso', 'Zolder isoleren', 'Zolder', 'bezig', 'L', 5, [1200, 2000], [], {
      doer: 'zelf',
      steps: [
        { id: 'z1', title: 'Isolatieplaten bestellen', done: true },
        { id: 'z2', title: 'Dakbeschot schoonmaken', done: true },
        { id: 'z3', title: 'Dampremmende folie', done: true },
        { id: 'z4', title: 'Platen plaatsen', done: false },
        { id: 'z5', title: 'Afwerken met gipsplaat', done: false },
      ],
    }),
    p('s-zolder-vloer', 'Zoldervloer leggen', 'Zolder', 'open', 'M', 4, [700, 1200], [['s-zolder-iso', 'hard']]),
    p('s-zolder-kamer', 'Zolderslaapkamer inrichten', 'Zolder', 'open', 'M', 4, [1000, 1500], [['s-zolder-vloer', 'hard']]),
    p('s-glas', 'HR++ glas woonkamer', 'Woonkamer', 'open', 'S', 5, [900, 1400], [], { doer: 'vakman' }),
    p('s-warmtepomp', 'Hybride warmtepomp', 'Heel het huis', 'open', 'XL', 5, [3500, 6000], [['s-glas', 'soft']], { doer: 'vakman' }),
    p('s-gang', 'Gang en trap schilderen', 'Gang en trap', 'open', 'M', 3, [150, 250], [], { doer: 'zelf' }),
    p('s-schuur', 'Schuur opruimen', 'Tuin', 'open', 'S', 2, undefined, [], { doer: 'zelf' }),
    p('s-plinten', 'Plinten woonkamer vervangen', 'Woonkamer', 'klaar', 'S', 2, [80, 120], [], { actualCost: 95, doer: 'zelf' }),
    p('s-lampen', 'Buitenlampen vervangen', 'Tuin', 'klaar', 'S', 3, [100, 200], [], { actualCost: 140, doer: 'zelf' }),
  ];
  const projects: Record<string, Project> = {};
  for (const x of list) projects[x.id] = x;
  return { version: 1, projects, goalId: 's-douche', rooms: [] };
}
