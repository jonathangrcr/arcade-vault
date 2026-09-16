export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};

export const GAMES: Game[] = [
  {
    id: "arkanoid",
    title: "ARKANOID",
    short: "Rebota la pelota y destruye muros de neón.",
    long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos a través de 5 niveles, cada uno más veloz que el anterior. Pierdes una vida si la pelota cae, y solo tienes 3 antes del game over.",
    cat: "ARCADE",
    cover: "cover-arkanoid",
    color: "cyan",
    best: 28450,
    plays: "12.4K",
  },
  {
    id: "tetris",
    title: "TETRIS",
    short: "Encaja las piezas antes de que el techo te aplaste.",
    long: "El clásico atemporal: piezas geométricas de siete formas caen desde la oscuridad. Rótalas con wall-kicks, usa la pieza fantasma para apuntar el aterrizaje y limpia líneas antes de que la pila te alcance. La velocidad no perdona: sube cada 10 líneas.",
    cat: "PUZZLE",
    cover: "cover-tetris",
    color: "magenta",
    best: 184220,
    plays: "31.8K",
  },
  {
    id: "serpentina",
    title: "SERPENTINA",
    short: "Crece sin morder tu propia cola.",
    long: "Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "green",
    best: 7820,
    plays: "9.1K",
  },
  {
    id: "gloton",
    title: "GLOTÓN",
    short: "Devora puntos y escapa de los fantasmas.",
    long: "Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.",
    cat: "ARCADE",
    cover: "cover-glot",
    color: "yellow",
    best: 96400,
    plays: "27.2K",
  },
  {
    id: "invasores",
    title: "INVASORES",
    short: "Defiende el planeta de filas alienígenas.",
    long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
    cat: "SHOOTER",
    cover: "cover-invaders",
    color: "green",
    best: 54190,
    plays: "18.0K",
  },
  {
    id: "rocas",
    title: "ROCAS",
    short: "Pulveriza asteroides en gravedad cero.",
    long: "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.",
    cat: "SHOOTER",
    cover: "cover-rocas",
    color: "yellow",
    best: 41200,
    plays: "15.6K",
  },
  {
    id: "asteroides",
    title: "ASTEROIDES",
    short: "Pilota una nave triangular y pulveriza rocas espaciales.",
    long: "Flota a la deriva en gravedad cero y dispara contra un campo de asteroides que se fragmenta con cada impacto. Consigue un power-up de disparo triple destruyendo rocas seguidas, y sobrevive con solo 3 vidas mientras el nivel se vuelve cada vez más denso.",
    cat: "SHOOTER",
    cover: "cover-asteroides",
    color: "yellow",
    best: 41200,
    plays: "0",
  },
  {
    id: "ranaria",
    title: "RANARIA",
    short: "Cruza la autopista de pixeles.",
    long: "Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.",
    cat: "ARCADE",
    cover: "cover-rana",
    color: "green",
    best: 18900,
    plays: "6.4K",
  },
  {
    id: "duelo-pixel",
    title: "DUELO PIXEL",
    short: "Dos paletas. Una pelota. Reflejos máximos.",
    long: "El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.",
    cat: "VERSUS",
    cover: "cover-duelo",
    color: "cyan",
    best: 24,
    plays: "4.2K",
  },
];

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
