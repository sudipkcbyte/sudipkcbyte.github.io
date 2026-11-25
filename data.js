/* ==========================================================================
   RAREBYTE — data.js  (v3)
   Question banks, answer matching, rarity tiers, daily challenge number.

   Public API (unchanged): RB.PLAYERS, RB.BANKS, RB.norm, RB.match, RB.tier,
                           RB.TODAY, RB.order, RB.dateOf, RB.suggest,
                           RB.today, RB.daily, RB.lev, RB.validateBanks
   New in v3:              RB.grade(bank, input)   one call -> full result
                           RB.share(bank, entry)   entry's share of the field
                           RB.selfTest()           quick data/matching check
                           RB.EXTRA_BANKS          8 more questions (opt-in)
                           RB.QUESTIONS_PER_DAY    7

   HOW SHARES WORK
   - "a" = the core answers. A bank's total is the sum of these weights only.
   - "x" = the long tail of other valid answers. They never change the total,
           so adding to "x" can never shift another answer's rarity tier.

   ROTATE_QUESTIONS
   - false (default): the same 7 questions as before, so nothing else in the
     game changes.
   - true: BANKS becomes all 15 and each day uses 7 of them. Only switch this
     on after checking game.js / views.js don't loop over BANKS.length.
   ========================================================================== */
(function (RB) {
  'use strict';

  if (typeof RB.rng !== 'function') {
    if (window.console) console.error('[RAREBYTE] data.js needs utils.js to load first.');
    return;
  }

  const rng = RB.rng;

  /* ---------- Constants --------------------------------------------------- */

  const PLAYERS = 18420; // simulated field size
  const MS_PER_DAY = 864e5;
  const EPOCH_UTC_MS = Date.UTC(2026, 0, 1); // challenge #1 = Jan 1, 2026
  const MIN_WEIGHT = 0.05;
  const QUESTIONS_PER_DAY = 7;
  const ROTATE_QUESTIONS = false;

  /* ---------- Core question banks (the original 7) ------------------------ */
  /* "Answer weight" pairs, comma separated. `person: 1` also accepts last
     names / surnames. `cat` is a label for future UI use. */

  const CORE_RAW = [
    {
      q: 'Name a country in the world.',
      cat: 'GEOGRAPHY',
      a: [
        'United States 13', 'India 10', 'China 9', 'Canada 8', 'France 8',
        'Germany 7', 'Japan 7', 'Brazil 6', 'Australia 6', 'Italy 5',
        'Spain 5', 'United Kingdom 5', 'Mexico 4', 'Russia 4', 'Egypt 3',
        'South Africa 3', 'Argentina 2.5', 'Nigeria 2', 'Turkey 2', 'Thailand 1.8',
        'Norway 1.5', 'Peru 1.2', 'Nepal 0.9', 'Kenya 0.8', 'Vietnam 0.8',
        'Bhutan 0.3', 'Mongolia 0.3', 'Laos 0.2', 'Eritrea 0.1', 'Tuvalu 0.05',
      ].join(','),
      x: [
        'South Korea 1.2', 'Indonesia 1', 'New Zealand 1', 'Pakistan 0.8', 'Ukraine 0.8',
        'Sweden 0.7', 'Netherlands 0.7', 'Switzerland 0.7', 'Greece 0.7', 'Colombia 0.7',
        'Philippines 0.7', 'Saudi Arabia 0.7', 'Portugal 0.6', 'Poland 0.6', 'Ireland 0.6',
        'Bangladesh 0.6', 'Chile 0.6', 'Cuba 0.6', 'Denmark 0.5', 'Finland 0.5',
        'Iran 0.5', 'Singapore 0.5', 'Morocco 0.5', 'Iceland 0.5', 'Belgium 0.4',
        'Austria 0.4', 'Israel 0.4', 'Iraq 0.4', 'Jamaica 0.4', 'Malaysia 0.4',
        'Sri Lanka 0.4', 'Ethiopia 0.4', 'North Korea 0.4', 'Afghanistan 0.4', 'Ghana 0.3',
        'Hungary 0.3', 'Czech Republic 0.3', 'Romania 0.3', 'Cambodia 0.25', 'Madagascar 0.2',
        'Maldives 0.15', 'Fiji 0.15', 'Luxembourg 0.1', 'Vatican City 0.1', 'Liechtenstein 0.05',
      ].join(','),
    },
    {
      q: 'Name a programming language.',
      cat: 'TECH',
      a: [
        'Python 16', 'JavaScript 15', 'Java 12', 'C++ 9', 'C 8',
        'C# 7', 'PHP 5', 'Ruby 4', 'Go 4', 'Swift 3.5',
        'Rust 3', 'Kotlin 3', 'TypeScript 3', 'SQL 2.5', 'R 1.5',
        'Perl 1', 'Haskell 0.6', 'Lua 0.6', 'Scala 0.5', 'Elixir 0.3',
        'COBOL 0.3', 'Fortran 0.2', 'Prolog 0.1', 'Brainfuck 0.05',
      ].join(','),
      x: [
        'Dart 0.8', 'MATLAB 0.6', 'Objective-C 0.6', 'Assembly 0.5', 'Bash 0.5',
        'Visual Basic 0.5', 'Lisp 0.4', 'Pascal 0.4', 'Basic 0.4', 'Julia 0.4',
        'Scratch 0.4', 'Delphi 0.2', 'Clojure 0.2', 'Erlang 0.2', 'Groovy 0.2',
        'PowerShell 0.2', 'F# 0.2', 'OCaml 0.15', 'Scheme 0.15', 'Smalltalk 0.15',
        'Ada 0.15', 'Solidity 0.15', 'Zig 0.1', 'Nim 0.1', 'Elm 0.1',
        'Racket 0.05', 'APL 0.05', 'Crystal 0.05',
      ].join(','),
    },
    {
      q: 'Name a fruit.',
      cat: 'FOOD',
      a: [
        'Apple 18', 'Banana 15', 'Orange 12', 'Mango 9', 'Grape 7',
        'Strawberry 7', 'Watermelon 5', 'Pineapple 5', 'Pear 3', 'Peach 3',
        'Cherry 3', 'Lemon 2.5', 'Kiwi 2', 'Papaya 1.5', 'Plum 1.2',
        'Pomegranate 1', 'Lychee 0.8', 'Guava 0.8', 'Fig 0.6', 'Dragon Fruit 0.5',
        'Jackfruit 0.4', 'Persimmon 0.2', 'Quince 0.1', 'Rambutan 0.1',
      ].join(','),
      x: [
        'Blueberry 1.6', 'Lime 1.6', 'Coconut 1.2', 'Raspberry 1', 'Avocado 0.8',
        'Grapefruit 0.7', 'Melon 0.6', 'Apricot 0.6', 'Tangerine 0.5', 'Blackberry 0.5',
        'Cantaloupe 0.4', 'Cranberry 0.4', 'Nectarine 0.3', 'Mandarin 0.3', 'Tomato 0.3',
        'Date 0.3', 'Durian 0.3', 'Passion Fruit 0.3', 'Clementine 0.2', 'Honeydew 0.2',
        'Star Fruit 0.2', 'Mangosteen 0.15', 'Pomelo 0.15', 'Custard Apple 0.1',
        'Gooseberry 0.1', 'Mulberry 0.1', 'Tamarind 0.1', 'Olive 0.1', 'Blackcurrant 0.05',
      ].join(','),
    },
    {
      q: 'Name a planet or a moon in our solar system.',
      cat: 'SPACE',
      a: [
        'Mars 14', 'Jupiter 12', 'Saturn 11', 'Earth 10', 'Venus 9',
        'Mercury 8', 'Neptune 6', 'Uranus 6', 'Moon 5', 'Pluto 4',
        'Titan 2', 'Europa 2', 'Io 1', 'Ganymede 0.8', 'Callisto 0.5',
        'Enceladus 0.5', 'Triton 0.4', 'Phobos 0.2', 'Charon 0.2', 'Ceres 0.15',
        'Eris 0.1', 'Miranda 0.05',
      ].join(','),
      x: [
        'Deimos 0.2', 'Mimas 0.2', 'Rhea 0.15', 'Ariel 0.15', 'Phoebe 0.1',
        'Dione 0.1', 'Iapetus 0.1', 'Tethys 0.1', 'Oberon 0.1', 'Titania 0.1',
        'Haumea 0.1', 'Makemake 0.1', 'Sedna 0.1', 'Vesta 0.1', 'Umbriel 0.05',
        'Hyperion 0.05', 'Amalthea 0.05', 'Himalia 0.05', 'Nereid 0.05', 'Proteus 0.05',
        'Pallas 0.05', 'Metis 0.05', 'Thebe 0.05', 'Janus 0.05', 'Atlas 0.05',
      ].join(','),
    },
    {
      q: 'Name a musical instrument.',
      cat: 'MUSIC',
      a: [
        'Guitar 16', 'Piano 15', 'Drums 12', 'Violin 9', 'Flute 7',
        'Trumpet 5', 'Saxophone 4', 'Cello 3', 'Harp 2.5', 'Clarinet 2.5',
        'Bass 2', 'Ukulele 2', 'Harmonica 1.5', 'Trombone 1.2', 'Accordion 1',
        'Banjo 1', 'Tabla 0.5', 'Sitar 0.4', 'Oboe 0.4', 'Didgeridoo 0.3',
        'Sarangi 0.1', 'Madal 0.1', 'Theremin 0.1',
      ].join(','),
      x: [
        'Keyboard 1.8', 'Xylophone 1', 'Recorder 1', 'Viola 0.9', 'Organ 0.8',
        'Tuba 0.8', 'Tambourine 0.8', 'French Horn 0.7', 'Bagpipe 0.6', 'Mandolin 0.6',
        'Triangle 0.5', 'Cymbal 0.5', 'Synthesizer 0.5', 'Maraca 0.4', 'Bassoon 0.4',
        'Bongo 0.3', 'Marimba 0.3', 'Piccolo 0.3', 'Kazoo 0.3', 'Timpani 0.3',
        'Gong 0.3', 'Conga 0.2', 'Bugle 0.2', 'Lute 0.2', 'Harpsichord 0.2',
        'Djembe 0.2', 'Harmonium 0.2', 'Ocarina 0.2', 'Pan Flute 0.2', 'Glockenspiel 0.15',
        'Castanets 0.15', 'Steel Drum 0.15', 'Cornet 0.1', 'Zither 0.1', 'Dulcimer 0.1',
        'Balalaika 0.1', 'Oud 0.1', 'Erhu 0.1', 'Koto 0.1', 'Cajon 0.1',
        'Bansuri 0.1', 'Tin Whistle 0.1', 'Shamisen 0.05', 'Celesta 0.05',
        'Mridangam 0.05', 'Santoor 0.05', 'Flugelhorn 0.05',
      ].join(','),
    },
    {
      q: 'Name a famous scientist.',
      cat: 'SCIENCE',
      person: 1,
      a: [
        'Albert Einstein 25', 'Isaac Newton 14', 'Marie Curie 9', 'Charles Darwin 8',
        'Stephen Hawking 8', 'Nikola Tesla 6', 'Galileo Galilei 5', 'Thomas Edison 3',
        'Louis Pasteur 2', 'Richard Feynman 1.5', 'Carl Sagan 1.5', 'Ada Lovelace 1',
        'Alan Turing 1', 'Rosalind Franklin 0.5', 'Srinivasa Ramanujan 0.4',
        'Katherine Johnson 0.3', 'Jagadish Bose 0.1', 'Emmy Noether 0.1',
        'Barbara McClintock 0.05',
      ].join(','),
      x: [
        'Niels Bohr 0.4', 'Michael Faraday 0.4', 'Archimedes 0.4', 'Gregor Mendel 0.4',
        'J. Robert Oppenheimer 0.4', 'Jane Goodall 0.4', 'Neil deGrasse Tyson 0.4',
        'Max Planck 0.3', 'Erwin Schrodinger 0.3', 'Johannes Kepler 0.3',
        'Nicolaus Copernicus 0.3', 'Alexander Fleming 0.3', 'Dmitri Mendeleev 0.3',
        'Edwin Hubble 0.3', 'Werner Heisenberg 0.25', 'James Clerk Maxwell 0.2',
        'Pythagoras 0.2', 'Ernest Rutherford 0.2', 'Enrico Fermi 0.15', 'Grace Hopper 0.15',
        'C. V. Raman 0.15', 'Euclid 0.1', 'Jonas Salk 0.1', 'Edward Jenner 0.1',
        'Robert Hooke 0.1', 'Robert Boyle 0.1', 'Antoine Lavoisier 0.1', 'Linus Pauling 0.1',
        'Francis Crick 0.1', 'James Watson 0.1', 'Tim Berners-Lee 0.1',
        'Subrahmanyan Chandrasekhar 0.1', 'Abdul Kalam 0.1', 'Lise Meitner 0.05',
        'Chien-Shiung Wu 0.05', 'Dorothy Hodgkin 0.05', 'Homi Bhabha 0.05',
      ].join(','),
    },
    {
      q: 'Name a famous mountain.',
      cat: 'GEOGRAPHY',
      a: [
        'Mount Everest 30', 'Kilimanjaro 8', 'K2 6', 'Fuji 6', 'Mont Blanc 5',
        'Matterhorn 4', 'Denali 3', 'Annapurna 1.5', 'Aconcagua 1.2', 'Olympus 1',
        'Rushmore 1', 'Kangchenjunga 0.8', 'Elbrus 0.8', 'Makalu 0.3', 'Lhotse 0.3',
        'Cho Oyu 0.2', 'Dhaulagiri 0.2', 'Cotopaxi 0.2', 'Manaslu 0.15', 'Ama Dablam 0.1',
        'Vinson 0.1',
      ].join(','),
      x: [
        'Mount Vesuvius 0.9', 'Mount Rainier 0.6', 'Mount St Helens 0.5', 'Mount Etna 0.5',
        'Table Mountain 0.4', 'Eiger 0.4', 'Pikes Peak 0.4', 'Mount Sinai 0.3',
        'Mount Ararat 0.3', 'Mount Kailash 0.3', 'Mauna Kea 0.3', 'Nanga Parbat 0.3',
        'Mount Whitney 0.2', 'Mount Kenya 0.2', 'Ben Nevis 0.2', 'Jungfrau 0.2',
        'Mount Hood 0.2', 'Mount Shasta 0.2', 'Mauna Loa 0.2', 'Mount Pinatubo 0.2',
        'Mount Washington 0.2', 'Half Dome 0.2', 'Machapuchare 0.2', 'Mount Kosciuszko 0.15',
        'Mount Cook 0.15', 'Gasherbrum 0.1', 'Chimborazo 0.1', 'Popocatepetl 0.1',
        'Mount Kinabalu 0.1', 'Mount Meru 0.1', 'Pumori 0.1', 'Mount Elbert 0.05',
        'Mount Logan 0.05', 'Mount Damavand 0.05', 'Broad Peak 0.05', 'Mount Tambora 0.05',
      ].join(','),
    },
  ];

  /* ---------- Extra question banks (opt-in via ROTATE_QUESTIONS) ---------- */

  const EXTRA_RAW = [
    {
      q: 'Name a color.',
      cat: 'COLORS',
      a: [
        'Blue 17', 'Red 15', 'Green 13', 'Yellow 9', 'Purple 8', 'Orange 8',
        'Black 6', 'Pink 6', 'White 4', 'Brown 3', 'Gray 2.5', 'Violet 1.5',
        'Turquoise 1.5', 'Teal 1.2', 'Indigo 1.2', 'Gold 1.2', 'Magenta 1', 'Silver 1',
        'Cyan 0.8', 'Maroon 0.8', 'Navy 0.8', 'Beige 0.6', 'Lavender 0.6', 'Crimson 0.5',
        'Mauve 0.4', 'Chartreuse 0.2', 'Vermilion 0.15', 'Periwinkle 0.15', 'Ochre 0.1',
        'Puce 0.05',
      ].join(','),
    },
    {
      q: 'Name an animal.',
      cat: 'NATURE',
      a: [
        'Dog 14', 'Cat 12', 'Lion 9', 'Elephant 8', 'Tiger 7', 'Horse 5', 'Monkey 4',
        'Giraffe 4', 'Bear 3', 'Dolphin 3', 'Rabbit 2.5', 'Wolf 2.5', 'Panda 2.5',
        'Zebra 2', 'Penguin 2', 'Kangaroo 2', 'Cow 1.8', 'Fox 1.5', 'Shark 1.5',
        'Eagle 1.3', 'Snake 1.2', 'Whale 1.2', 'Deer 1', 'Owl 1', 'Camel 1', 'Gorilla 1',
        'Chimpanzee 1', 'Sheep 0.9', 'Pig 0.9', 'Koala 0.8', 'Cheetah 0.8', 'Turtle 0.8',
        'Crocodile 0.8', 'Leopard 0.7', 'Octopus 0.6', 'Frog 0.6', 'Bat 0.6',
        'Hippopotamus 0.5', 'Rhinoceros 0.5', 'Alligator 0.4', 'Orca 0.4', 'Platypus 0.3',
        'Capybara 0.3', 'Yak 0.2', 'Snow Leopard 0.2', 'Axolotl 0.2', 'Pangolin 0.15',
        'Aardvark 0.15', 'Narwhal 0.15', 'Okapi 0.1', 'Quokka 0.1', 'Tapir 0.1',
        'Binturong 0.05',
      ].join(','),
    },
    {
      q: 'Name a sport.',
      cat: 'SPORTS',
      a: [
        'Football 14', 'Cricket 13', 'Basketball 12', 'Tennis 9', 'Soccer 8', 'Baseball 6',
        'Swimming 5', 'Golf 4', 'Volleyball 4', 'Rugby 3.5', 'American Football 3',
        'Badminton 3', 'Hockey 3', 'Boxing 2.5', 'Table Tennis 2', 'Cycling 2',
        'Athletics 1.8', 'Wrestling 1.8', 'Gymnastics 1.8', 'Skiing 1.5', 'Archery 1.2',
        'Karate 1.2', 'Judo 1', 'Skateboarding 1', 'Surfing 1', 'Ice Hockey 1',
        'Taekwondo 0.8', 'Handball 0.8', 'Fencing 0.8', 'Rowing 0.7', 'Weightlifting 0.7',
        'Snowboarding 0.7', 'Squash 0.6', 'Water Polo 0.4', 'Lacrosse 0.4', 'Curling 0.3',
        'Polo 0.3', 'Kabaddi 0.3', 'Dodgeball 0.2', 'Pickleball 0.1', 'Futsal 0.1',
        'Netball 0.1', 'Biathlon 0.1', 'Bobsled 0.1', 'Hurling 0.05', 'Kho Kho 0.05',
        'Sepak Takraw 0.05',
      ].join(','),
    },
    {
      q: 'Name a famous painter or artist.',
      cat: 'ART',
      person: 1,
      a: [
        'Leonardo da Vinci 20', 'Pablo Picasso 18', 'Vincent van Gogh 16', 'Claude Monet 8',
        'Michelangelo 6', 'Salvador Dali 5', 'Rembrandt 4', 'Andy Warhol 3.5',
        'Frida Kahlo 3', 'Edvard Munch 1.5', 'Johannes Vermeer 1.5', 'Henri Matisse 1.5',
        'Jackson Pollock 1.5', "Georgia O'Keeffe 1", 'Paul Cezanne 1', 'Banksy 1',
        'Raphael 1', 'Gustav Klimt 1', 'Rene Magritte 0.8', 'Francisco Goya 0.7',
        'Edgar Degas 0.6', 'Pierre-Auguste Renoir 0.6', 'Caravaggio 0.6',
        'Jean-Michel Basquiat 0.5', 'Sandro Botticelli 0.4', 'Mark Rothko 0.4',
        'Piet Mondrian 0.4', 'Paul Gauguin 0.3', 'Wassily Kandinsky 0.3', 'Keith Haring 0.3',
        'Hokusai 0.3', 'M. C. Escher 0.3', 'Yayoi Kusama 0.3', 'Diego Rivera 0.3',
        'Georges Seurat 0.2', 'Joan Miro 0.2', 'Titian 0.2', 'Paul Klee 0.1',
        'Egon Schiele 0.1', 'Jan van Eyck 0.1', 'Raja Ravi Varma 0.1',
        'Artemisia Gentileschi 0.1', 'Tamara de Lempicka 0.05', 'Hilma af Klint 0.05',
        'Amrita Sher-Gil 0.05',
      ].join(','),
    },
    {
      q: 'Name a food from Nepal.',
      cat: 'NEPAL',
      a: [
        'Dal Bhat 25', 'Momo 24', 'Sel Roti 6', 'Thukpa 5', 'Chowmein 4', 'Samosa 3',
        'Gundruk 3', 'Dhido 3', 'Sekuwa 2.5', 'Chatamari 2', 'Yomari 2', 'Pani Puri 1.5',
        'Choila 1.2', 'Aloo Tama 1', 'Juju Dhau 1', 'Kheer 1', 'Kwati 0.8', 'Bara 0.6',
        'Achar 0.5', 'Laphing 0.5', 'Lassi 0.5', 'Jalebi 0.5', 'Sukuti 0.3',
        'Bhatmas Sadeko 0.3', 'Tarkari 0.3', 'Gyakok 0.1',
      ].join(','),
    },
    {
      q: 'Name a famous author or writer.',
      cat: 'BOOKS',
      person: 1,
      a: [
        'William Shakespeare 15', 'J. K. Rowling 10', 'Charles Dickens 5', 'Mark Twain 5',
        'Jane Austen 4', 'Ernest Hemingway 3.5', 'Stephen King 3.5', 'Agatha Christie 3',
        'George Orwell 3', 'J. R. R. Tolkien 3', 'Leo Tolstoy 2.5', 'Roald Dahl 2.5',
        'Edgar Allan Poe 2', 'Dan Brown 1.5', 'Fyodor Dostoevsky 1.5',
        'F. Scott Fitzgerald 1.5', 'C. S. Lewis 1.5', 'Arthur Conan Doyle 1.5',
        'Paulo Coelho 1.2', 'Harper Lee 1.2', 'George R. R. Martin 1.2', 'Victor Hugo 1',
        'Homer 1', 'Dr. Seuss 1', 'Rabindranath Tagore 0.8', 'Haruki Murakami 0.8',
        'Jules Verne 0.8', 'H. G. Wells 0.8', 'Suzanne Collins 0.8',
        'Gabriel Garcia Marquez 0.7', 'Franz Kafka 0.7', 'Oscar Wilde 0.7',
        'Virginia Woolf 0.6', 'Isaac Asimov 0.6', 'Rick Riordan 0.5', 'Dante Alighieri 0.5',
        'Miguel de Cervantes 0.5', 'Maya Angelou 0.4', 'Toni Morrison 0.4',
        'Robert Frost 0.4', 'Emily Bronte 0.4', 'Charlotte Bronte 0.4', 'Aldous Huxley 0.4',
        'Chinua Achebe 0.3', 'Emily Dickinson 0.3', 'Walt Whitman 0.3',
        'William Wordsworth 0.3', 'Lord Byron 0.3', 'Ray Bradbury 0.3', 'Neil Gaiman 0.3',
        'Terry Pratchett 0.3', 'Munshi Premchand 0.3', 'Kahlil Gibran 0.2',
        'Laxmi Prasad Devkota 0.15', 'Bhanubhakta Acharya 0.1', 'Lekhnath Paudyal 0.05',
        'Parijat 0.05', 'B. P. Koirala 0.05',
      ].join(','),
    },
    {
      q: 'Name a vegetable.',
      cat: 'FOOD',
      a: [
        'Potato 14', 'Carrot 14', 'Tomato 9', 'Onion 8', 'Broccoli 6', 'Spinach 5',
        'Cabbage 4', 'Cauliflower 4', 'Cucumber 3.5', 'Pea 3', 'Corn 3', 'Lettuce 3',
        'Pumpkin 2', 'Garlic 2', 'Eggplant 1.5', 'Pepper 1.5', 'Mushroom 1.2',
        'Beetroot 1.2', 'Green Bean 1', 'Radish 1', 'Celery 1', 'Sweet Potato 1',
        'Zucchini 0.8', 'Brussels Sprout 0.8', 'Okra 0.6', 'Asparagus 0.6', 'Kale 0.6',
        'Turnip 0.5', 'Squash 0.5', 'Leek 0.4', 'Artichoke 0.3', 'Bitter Gourd 0.2',
        'Yam 0.2', 'Taro 0.2', 'Parsnip 0.2', 'Cassava 0.2', 'Bok Choy 0.2',
        'Bottle Gourd 0.1', 'Kohlrabi 0.1', 'Fennel 0.1', 'Rhubarb 0.1',
      ].join(','),
    },
    {
      q: 'Name a famous city.',
      cat: 'GEOGRAPHY',
      a: [
        'Paris 12', 'New York 11', 'London 10', 'Tokyo 8', 'Rome 6', 'Dubai 4',
        'Sydney 3.5', 'Los Angeles 3', 'Singapore 2.5', 'Barcelona 2.5', 'Istanbul 2',
        'Mumbai 2', 'Delhi 2', 'Berlin 2', 'Beijing 2', 'Cairo 1.8', 'Moscow 1.8',
        'Bangkok 1.5', 'Amsterdam 1.5', 'Venice 1.5', 'Toronto 1.2', 'Madrid 1.2',
        'Kathmandu 1', 'San Francisco 1', 'Chicago 1', 'Rio de Janeiro 1', 'Seoul 1',
        'Hong Kong 1', 'Vienna 0.8', 'Prague 0.8', 'Las Vegas 0.8', 'Washington DC 0.8',
        'Cape Town 0.7', 'Lisbon 0.6', 'Athens 0.6', 'Buenos Aires 0.6', 'Kyoto 0.6',
        'Mexico City 0.5', 'Lagos 0.3', 'Nairobi 0.3', 'Reykjavik 0.2', 'Pokhara 0.15',
        'Lhasa 0.1', 'Timbuktu 0.1', 'Ulaanbaatar 0.05',
      ].join(','),
    },
  ];

  /* ---------- Aliases (alternate spellings -> canonical answer) ----------- */
  /* Keys and values are normalised at load, so write them naturally. An alias
     only takes effect in banks that actually contain its target answer. */

  const ALIAS_RAW = {
    // Countries
    usa: 'United States', us: 'United States', 'u s a': 'United States', 'u s': 'United States',
    'united states of america': 'United States', america: 'United States',
    uk: 'United Kingdom', 'u k': 'United Kingdom', gb: 'United Kingdom',
    england: 'United Kingdom', britain: 'United Kingdom', 'great britain': 'United Kingdom',
    deutschland: 'Germany', nippon: 'Japan', bharat: 'India', prc: 'China',
    'russian federation': 'Russia', turkiye: 'Turkey', brasil: 'Brazil',
    espana: 'Spain', italia: 'Italy', holland: 'Netherlands', czechia: 'Czech Republic',
    // Programming languages
    js: 'JavaScript', ts: 'TypeScript', py: 'Python', cpp: 'C++',
    'c plus plus': 'C++', csharp: 'C#', 'c sharp': 'C#', golang: 'Go', bf: 'Brainfuck',
    objc: 'Objective-C', vb: 'Visual Basic', asm: 'Assembly', 'assembly language': 'Assembly',
    shell: 'Bash', 'f sharp': 'F#', fsharp: 'F#',
    // Fruit
    pitaya: 'Dragon Fruit', litchi: 'Lychee',
    // Planets & moons
    'the moon': 'Moon', luna: 'Moon',
    // Instruments
    'electric guitar': 'Guitar', 'acoustic guitar': 'Guitar',
    'bass guitar': 'Bass', 'double bass': 'Bass', 'upright bass': 'Bass',
    'drum kit': 'Drums', 'drum set': 'Drums', sax: 'Saxophone', uke: 'Ukulele',
    didjeridu: 'Didgeridoo', didjeridoo: 'Didgeridoo',
    'electric keyboard': 'Keyboard', synth: 'Synthesizer', 'steel pan': 'Steel Drum',
    // Mountains
    'mt fuji': 'Fuji', 'mount fuji': 'Fuji', fujiyama: 'Fuji', fujisan: 'Fuji',
    sagarmatha: 'Mount Everest', chomolungma: 'Mount Everest', qomolangma: 'Mount Everest',
    kili: 'Kilimanjaro', mckinley: 'Denali', 'saint helens': 'Mount St Helens',
    kosciusko: 'Mount Kosciuszko',
    // Scientists
    galileo: 'Galileo Galilei',
    // Colors
    grey: 'Gray', aqua: 'Cyan', 'navy blue': 'Navy',
    // Animals
    hippo: 'Hippopotamus', rhino: 'Rhinoceros', bunny: 'Rabbit', chimp: 'Chimpanzee',
    croc: 'Crocodile', 'killer whale': 'Orca', gator: 'Alligator',
    // Sports
    'ping pong': 'Table Tennis', 'track and field': 'Athletics', track: 'Athletics',
    running: 'Athletics', gym: 'Gymnastics', bobsleigh: 'Bobsled',
    // Artists
    leonardo: 'Leonardo da Vinci', frida: 'Frida Kahlo', 'katsushika hokusai': 'Hokusai',
    // Food from Nepal
    'dal bhat tarkari': 'Dal Bhat', 'daal bhat': 'Dal Bhat', 'dhal bhat': 'Dal Bhat',
    'dal bhaat': 'Dal Bhat', 'daal bhaat': 'Dal Bhat', 'dhal baht': 'Dal Bhat',
    'buff momo': 'Momo', 'chicken momo': 'Momo', 'veg momo': 'Momo',
    yamari: 'Yomari', laping: 'Laphing',
    // Authors
    'samuel clemens': 'Mark Twain', 'theodor geisel': 'Dr. Seuss',
    // Vegetables
    aubergine: 'Eggplant', brinjal: 'Eggplant', courgette: 'Zucchini',
    ladyfinger: 'Okra', 'lady finger': 'Okra', bhindi: 'Okra', karela: 'Bitter Gourd',
    'bell pepper': 'Pepper', capsicum: 'Pepper', beet: 'Beetroot', spud: 'Potato',
    sweetcorn: 'Corn', maize: 'Corn', 'brussel sprout': 'Brussels Sprout',
    sprout: 'Brussels Sprout', 'pak choi': 'Bok Choy', lauki: 'Bottle Gourd',
    // Cities
    nyc: 'New York', ny: 'New York', 'big apple': 'New York',
    la: 'Los Angeles', 'l a': 'Los Angeles', sf: 'San Francisco', 'san fran': 'San Francisco',
    dc: 'Washington DC', 'd c': 'Washington DC', 'new delhi': 'Delhi', bombay: 'Mumbai',
    peking: 'Beijing', rio: 'Rio de Janeiro', vegas: 'Las Vegas', hk: 'Hong Kong',
    katmandu: 'Kathmandu',
  };

  /* ---------- Text normalisation ------------------------------------------ */

  /** Lowercase, strip accents/punctuation/possessives and leading Mount/Mt/The. */
  function norm(str) {
    let s = String(str == null ? '' : str);
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return s
      .toLowerCase()
      .replace(/['\u2019`]s\b/g, '') // Newton's -> newton
      .replace(/[^a-z0-9+# ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(?:(?:mount|mt|the)\s+)+/, '');
  }

  const flat = (s) => s.replace(/ /g, '');

  // Null-prototype so inputs like "constructor" can never hit Object.prototype.
  const ALIAS = Object.create(null);
  Object.keys(ALIAS_RAW).forEach((key) => {
    ALIAS[norm(key)] = norm(ALIAS_RAW[key]);
  });

  // Honorifics that may precede a person's name ("Sir Isaac Newton").
  const TITLES = new Set([
    'dr', 'doctor', 'prof', 'professor', 'sir', 'dame', 'madame', 'mme',
    'mr', 'mrs', 'ms', 'lord', 'lady', 'saint',
  ]);

  function stripTitles(n) {
    const parts = n.split(' ');
    while (parts.length > 1 && TITLES.has(parts[0])) parts.shift();
    return parts.join(' ');
  }

  function singularizeToken(token) {
    if (!token || token.length <= 3) return token;
    if (token.endsWith('ies') && token.length > 4) return token.slice(0, -3) + 'y';
    if (/(ches|shes|xes|zes|sses|oes)$/.test(token)) return token.slice(0, -2);
    if (token.endsWith('s') && !/(ss|us|is)$/.test(token)) return token.slice(0, -1);
    return token;
  }

  const singular = (s) => s.split(' ').map(singularizeToken).join(' ');

  /** Ordered, de-duplicated lookup keys for one normalised input. */
  function candidateKeys(n) {
    const out = [];
    const add = (k) => {
      if (k && out.indexOf(k) === -1) out.push(k);
    };
    const expand = (k) => {
      add(k);
      add(singular(k));
      add(flat(k));
    };

    expand(n);
    if (ALIAS[n]) expand(ALIAS[n]);
    const sing = singular(n);
    if (ALIAS[sing]) expand(ALIAS[sing]);
    return out;
  }

  /* ---------- Bank parsing & indexing ------------------------------------- */

  const ENTRY_RE = /^(.*\S)\s+(\d+(?:\.\d+)?)$/;

  function parseEntry(item, extra) {
    const trimmed = item.trim();
    if (!trimmed) return null;

    // Only treat the last token as a weight when it is actually a number,
    // so a multi-word name without a weight is never chopped.
    const m = ENTRY_RE.exec(trimmed);
    const name = m ? m[1].trim() : trimmed;
    const weight = m ? parseFloat(m[2]) : 0;
    const normalized = norm(name);
    const parts = normalized.split(' ').filter(Boolean);

    return {
      name: name,
      w: Number.isFinite(weight) && weight > 0 ? weight : MIN_WEIGHT,
      extra: Boolean(extra),
      _norm: normalized,
      _flat: flat(normalized),
      _last: parts.length ? parts[parts.length - 1] : normalized,
    };
  }

  function parseList(text, extra) {
    return String(text || '')
      .split(',')
      .map((item) => parseEntry(item, extra))
      .filter((entry) => entry && entry.name);
  }

  function parseBank(rawBank) {
    const core = parseList(rawBank.a, false);
    const tail = parseList(rawBank.x, true);

    // Only the core answers define the field. Tail answers sit on top of it,
    // so they can never push another answer across a tier boundary.
    const total = core.reduce((sum, entry) => sum + entry.w, 0);

    return {
      q: rawBank.q,
      cat: rawBank.cat || '',
      person: rawBank.person ? 1 : 0,
      list: core.concat(tail),
      total: total || 1,
    };
  }

  const CORE_BANKS = CORE_RAW.map(parseBank);
  const EXTRA_BANKS = EXTRA_RAW.map(parseBank);
  const ALL_BANKS = CORE_BANKS.concat(EXTRA_BANKS);
  const BANKS = ROTATE_QUESTIONS ? ALL_BANKS : CORE_BANKS;

  // Lazy per-bank lookup index (WeakMap keeps the public bank objects clean).
  const INDEX = new WeakMap();

  function indexFor(bank) {
    let ix = INDEX.get(bank);
    if (ix) return ix;

    const exact = new Map();
    const loose = new Map();
    const suffixFirst = new Map();
    const suffixCount = new Map();

    bank.list.forEach((entry) => {
      if (!exact.has(entry._norm)) exact.set(entry._norm, entry);
    });

    bank.list.forEach((entry) => {
      // Plural-tolerant keys. Short words ("Mars") are left alone on purpose.
      const sing = entry._norm.length > 4 ? singular(entry._norm) : entry._norm;
      [sing, entry._flat].forEach((key) => {
        if (key && !exact.has(key) && !loose.has(key)) loose.set(key, entry);
      });

      // Every trailing part of a name: "Vincent van Gogh" -> "van gogh", "gogh".
      const parts = entry._norm.split(' ').filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        const key = parts.slice(i).join(' ');
        suffixCount.set(key, (suffixCount.get(key) || 0) + 1);
        if (!suffixFirst.has(key)) suffixFirst.set(key, entry);
      }
    });

    // A partial name only counts when it identifies exactly one person.
    const last = new Map();
    suffixFirst.forEach((entry, key) => {
      if (suffixCount.get(key) !== 1) return;
      if (!last.has(key)) last.set(key, entry);
      if (!last.has(flat(key))) last.set(flat(key), entry);
    });

    ix = { exact: exact, loose: loose, last: last };
    INDEX.set(bank, ix);
    return ix;
  }

  /* ---------- Matching ---------------------------------------------------- */

  /** Find the bank entry that a typed answer refers to, or null. */
  function match(bank, input) {
    if (!bank || !Array.isArray(bank.list)) return null;
    const n = norm(input);
    if (!n) return null;

    const ix = indexFor(bank);
    let keys = candidateKeys(n);

    if (bank.person) {
      const stripped = stripTitles(n);
      if (stripped !== n) {
        keys = keys.concat(candidateKeys(stripped).filter((k) => keys.indexOf(k) === -1));
      }
    }

    for (let i = 0; i < keys.length; i++) {
      const hit = ix.exact.get(keys[i]) || ix.loose.get(keys[i]);
      if (hit) return hit;
    }

    if (bank.person) {
      for (let j = 0; j < keys.length; j++) {
        const hit = ix.last.get(keys[j]);
        if (hit) return hit;
      }
    }

    return null;
  }

  /* ---------- Rarity tiers ------------------------------------------------ */

  /** share is a fraction of the field (0.02 = 2%). */
  function tier(share) {
    const pct = (Number(share) || 0) * 100;
    if (pct >= 10) return { pts: 10, label: 'VERY COMMON', cls: 't10' };
    if (pct >= 4) return { pts: 25, label: 'COMMON', cls: 't25' };
    if (pct >= 1.5) return { pts: 50, label: 'UNCOMMON', cls: 't50' };
    if (pct >= 0.5) return { pts: 100, label: 'RARE', cls: 't100' };
    return { pts: 200, label: 'EXTREMELY RARE', cls: 't200' };
  }

  /** An entry's share of the simulated field, as a fraction (0 to 1). */
  function share(bank, entry) {
    if (!bank || !entry) return 0;
    return Math.min(1, Math.max(0, entry.w / (bank.total || 1)));
  }

  /* ---------- Daily challenge --------------------------------------------- */

  /** Challenge number for a date (uses the player's local calendar day). */
  function dayIndex(dateObj) {
    const d = dateObj instanceof Date && !isNaN(dateObj) ? dateObj : new Date();
    const dayStart = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.max(1, Math.floor((dayStart - EPOCH_UTC_MS) / MS_PER_DAY) + 1);
  }

  // Fixed when the page loads (kept for compatibility). Use RB.today() for
  // the live value if the tab may stay open past midnight.
  const TODAY = dayIndex(new Date());

  /** Seeded question order for a given challenge number (7 bank indices). */
  function order(day) {
    const count = BANKS.length;
    const indices = [];
    for (let k = 0; k < count; k++) indices.push(k);

    const rand = rng((Number(day) || 1) * 7919);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    return indices.slice(0, Math.min(QUESTIONS_PER_DAY, count));
  }

  /** The banks for a challenge, already in play order. */
  function daily(day) {
    return order(day).map((i) => BANKS[i]);
  }

  /** "Jan 1" style label for a challenge number. */
  function dateOf(day) {
    const n = Number(day);
    const d = new Date(EPOCH_UTC_MS + ((Number.isFinite(n) ? n : 1) - 1) * MS_PER_DAY);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  /* ---------- Typo suggestions ("did you mean...?") ----------------------- */

  /** Edit distance that also counts a swapped pair of letters as one edit. */
  function lev(a, b) {
    const s = String(a || '');
    const t = String(b || '');
    const m = s.length;
    const n = t.length;
    if (m === 0) return n;
    if (n === 0) return m;

    let prev2 = new Array(n + 1);
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      const si = s.charCodeAt(i - 1);
      for (let j = 1; j <= n; j++) {
        const tj = t.charCodeAt(j - 1);
        let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (si === tj ? 0 : 1));
        if (i > 1 && j > 1 && si === t.charCodeAt(j - 2) && s.charCodeAt(i - 2) === tj) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        curr[j] = v;
      }
      const spare = prev2;
      prev2 = prev;
      prev = curr;
      curr = spare;
    }
    return prev[n];
  }

  /** Closest bank entry to a mistyped answer, or null if nothing is close. */
  function suggest(bank, input) {
    if (!bank || !Array.isArray(bank.list)) return null;
    const n = norm(input);
    if (!n) return null;

    const maxEdit = n.length >= 7 ? 2 : n.length >= 4 ? 1 : 0;
    if (!maxEdit) return null;
    if (match(bank, input)) return null; // already a valid answer

    const nFlat = flat(n);
    let best = null;
    let bestDist = Infinity;

    bank.list.forEach((entry) => {
      const targets = bank.person ? [entry._norm, entry._last] : [entry._norm, entry._flat];
      let dist = Infinity;

      targets.forEach((target) => {
        if (!target || Math.abs(target.length - n.length) > maxEdit + 1) return;
        dist = Math.min(dist, lev(n, target), lev(nFlat, flat(target)));
      });

      if (dist > 0 && dist <= maxEdit) {
        // Closest wins; on a tie, prefer the more popular answer.
        if (dist < bestDist || (dist === bestDist && best && entry.w > best.w)) {
          bestDist = dist;
          best = entry;
        }
      }
    });

    return best;
  }

  /* ---------- One-call grading -------------------------------------------- */

  /**
   * Everything the game needs for one answer:
   * { matched, entry, share, tier, players, suggestion }
   * `players` is how many of the simulated field gave the same answer.
   */
  function grade(bank, input) {
    const entry = match(bank, input);
    if (!entry) {
      return {
        matched: false,
        entry: null,
        share: 0,
        tier: null,
        players: 0,
        suggestion: suggest(bank, input),
      };
    }

    const s = share(bank, entry);
    return {
      matched: true,
      entry: entry,
      share: s,
      tier: tier(s),
      players: Math.max(1, Math.round(s * PLAYERS)),
      suggestion: null,
    };
  }

  /* ---------- Data self-check --------------------------------------------- */

  /** Returns a list of human-readable problems with the data (empty = OK). */
  function validateBanks() {
    const problems = [];

    ALL_BANKS.forEach((bank, bi) => {
      const seen = new Set();
      if (bank.list.length < 5) problems.push('Bank ' + (bi + 1) + ' has very few answers.');
      bank.list.forEach((entry) => {
        if (seen.has(entry._norm)) {
          problems.push('Bank ' + (bi + 1) + ': duplicate answer "' + entry.name + '".');
        }
        seen.add(entry._norm);
      });
    });

    Object.keys(ALIAS).forEach((key) => {
      const target = ALIAS[key];
      const found = ALL_BANKS.some((bank) => indexFor(bank).exact.has(target));
      if (!found) problems.push('Alias "' + key + '" points to missing answer "' + target + '".');
    });

    return problems;
  }

  /* [bank index in ALL_BANKS, typed input, expected answer name or null] */
  const SELF_TESTS = [
    [0, 'USA', 'United States'], [0, 'Türkiye', 'Turkey'], [0, 'the Netherlands', 'Netherlands'],
    [0, 'holland', 'Netherlands'], [0, 'Atlantis', null],
    [1, 'c sharp', 'C#'], [1, 'JS', 'JavaScript'], [1, 'objective c', 'Objective-C'],
    [2, 'blueberries', 'Blueberry'], [2, 'dragonfruit', 'Dragon Fruit'], [2, 'litchi', 'Lychee'],
    [3, 'the moon', 'Moon'], [4, 'drum', 'Drums'], [4, 'cymbals', 'Cymbal'],
    [5, 'Einstein', 'Albert Einstein'], [5, 'Sir Isaac Newton', 'Isaac Newton'],
    [5, 'Galileo', 'Galileo Galilei'], [5, 'Schrödinger', 'Erwin Schrodinger'],
    [6, 'Mt. Everest', 'Mount Everest'], [6, 'Mount Saint Helens', 'Mount St Helens'],
    [8, 'hippo', 'Hippopotamus'], [9, 'ping pong', 'Table Tennis'],
    [10, 'Van Gogh', 'Vincent van Gogh'], [10, 'da vinci', 'Leonardo da Vinci'],
    [11, 'daal bhat', 'Dal Bhat'], [11, 'momos', 'Momo'],
    [12, 'JK Rowling', 'J. K. Rowling'], [12, 'Bronte', null],
    [13, 'tomatoes', 'Tomato'], [14, 'NYC', 'New York'],
  ];

  const SUGGEST_TESTS = [
    [0, 'Frnace', 'France'], [0, 'Germny', 'Germany'], [1, 'Pyton', 'Python'],
  ];

  /** Runs the built-in matching tests. Returns a list of failures (empty = OK). */
  function selfTest() {
    const failures = [];

    SELF_TESTS.forEach((t) => {
      const hit = match(ALL_BANKS[t[0]], t[1]);
      const got = hit ? hit.name : null;
      if (got !== t[2]) {
        failures.push('match(' + t[0] + ', "' + t[1] + '") gave ' + got + ', expected ' + t[2]);
      }
    });

    SUGGEST_TESTS.forEach((t) => {
      const hit = suggest(ALL_BANKS[t[0]], t[1]);
      const got = hit ? hit.name : null;
      if (got !== t[2]) {
        failures.push('suggest(' + t[0] + ', "' + t[1] + '") gave ' + got + ', expected ' + t[2]);
      }
    });

    return failures;
  }

  const problems = validateBanks().concat(selfTest());
  if (problems.length && window.console && console.warn) {
    console.warn('[RAREBYTE] data check:\n- ' + problems.join('\n- '));
  }

  /* ---------- Export ------------------------------------------------------ */

  Object.assign(RB, {
    PLAYERS: PLAYERS,
    BANKS: BANKS,
    EXTRA_BANKS: EXTRA_BANKS,
    QUESTIONS_PER_DAY: QUESTIONS_PER_DAY,
    norm: norm,
    match: match,
    tier: tier,
    share: share,
    grade: grade,
    TODAY: TODAY,
    today: function () {
      return dayIndex(new Date());
    },
    order: order,
    daily: daily,
    dateOf: dateOf,
    suggest: suggest,
    lev: lev,
    validateBanks: validateBanks,
    selfTest: selfTest,
  });
})((window.RB = window.RB || {}));
