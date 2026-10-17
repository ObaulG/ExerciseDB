#set document(title: "TD1 — Le calcul sous toutes ses formes")
#set text(lang: "fr", size: 12pt)
#set par(justify: true, leading: 0.65em)
#show emph: set text(weight: "bold")

#import "@preview/longops:0.1.0": addition, soustraction, multiplication, division

#set page(
  paper: "a4",
  margin: 2.5cm,
  header: context {
    grid(
      columns: (1fr, auto, 1fr),
      align(left)[Licence 2 Sciences de l’Éducation],
      [],
      align(right)[Didactique des mathématiques],
    )
    line(length: 100%, stroke: 0.5pt)
  },
  footer: context {
    align(center, counter(page).display())
  },
)

// Valeurs possibles :
// "student"      → exercices uniquement
// "teacher"      → exercices et corrigés
// "answers-only" → corrigés uniquement

#let document-mode = "student"
#let show-exercises = document-mode != "answers-only"
#let show-answers = document-mode != "student"

#let exercise-counter = counter("exercise")


#let question-counter = counter("question")

#let exercise(body, title: none, difficulty: 0) = context {
  if show-exercises{
  exercise-counter.step()
  question-counter.update(1)
  let n = exercise-counter.get().first()
  block(width: 100%, inset: 10pt, stroke: 0.8pt, radius: 2pt, breakable: true)[
    *Exercice #n*#if title != none { [ — #title] }
    #if difficulty > 0 { [ #h(1fr) Difficulté : #difficulty] }
    #v(0.5em)
    #body
  ]}
}



#let question(body) = context {
  question-counter.step()
  [*Question #question-counter.display().* #body]
}

#let answer(body) = context {
  if show-answers{
    
  
  block(
  width: 100%,
  inset: 10pt,
  fill: rgb("f5f8fc"),
  stroke: rgb("4f6b8a"),
  radius: 2pt,
  breakable: true,
)[
  #context { question-counter.update(0) }
  *Corrigé*
  #v(0.5em)
  #body
]
}}

#let definition(body) = block(
  width: 100%,
  inset: 9pt,
  fill: luma(92%),
  stroke: 0.7pt,
  radius: 2pt,
  breakable: true,
)[*Définition.* #body]

#align(center)[
  #text(size: 22pt, weight: "bold")[TD1]
]

= Exercices classiques
<exercices-classiques>

#exercise-counter.step()
#exercise(title: [Retour aux bases], difficulty: 0)[
Effectuer les calculs suivants de tête, puis écrire la démarche suivie.

Exemple: $67 plus 35 eq 67 plus 33 plus 2 eq 100 plus 2 eq 102$

#columns(3, gutter: 1em)[
- $51 plus 99$

- $1996 minus 1927$

- $259 plus 274$

- $14 times 5$
#colbreak()
- $67 times 9$

- $43 times 11$

- $15 times 25$

- $60 times 14$
#colbreak()
- $17 times 13$

- $104 times 96$

- $999 times 999$

- $493 times 507$
]
]

#exercise(title: [Calcul posé], difficulty: 0)[
Calculer les expressions suivantes en posant les calculs. Les divisions
effectuées sont des divisions euclidiennes.

#columns(3, gutter: 1em)[
- $73 times 154$

- $192 times 105$

- $824 times 967$

- $1920 times 1080$

#colbreak()
- $3840 times 2160$

- $15368 times 810$

- $148 div 7$

- $988 div 13$
#colbreak()
- $1923 div 25$

- $96542 div 42$

- $32768 div 192$

- $123456789 div 99$
]
]

#exercise(title: [Calcul en ligne], difficulty: 0)[
Calculer les expressions suivantes :

- $lr((lr((lr((64 slash 4)) minus 9)) times 4))$

- $lr((lr((lr((lr((lr((975 slash 25)) plus 15)) times 5)) minus 205)) slash 5))$

- $lr((lr((lr((lr((lr((135 slash 9)) plus 117)) slash 3)) minus 27)) times 19))$
]

#exercise(title: [Calcul avec les puissances], difficulty: 0)[
Écrire les expressions suivantes sous la forme $a^n$ avec
$a in bb(N) comma med b in bb(Z)$:

#columns(3, gutter: 1em)[
+ $2^2 times 2^8$

+ $lr((2^8))^3$

+ $4^(2^3)$

+ $10^(2^5)$

+ $8^(5^6) times 8^(3^2)$

+ $2^8 times 4^4 times 8^2$

+ $7^7 times 4^7$
]
]

#exercise(title: [Décomposition en produit de facteurs premiers], difficulty: 0)[
#question[]

#emph[DNB Maths 2025, Exercice 5]

Parmi les trois expressions suivantes, laquelle correspond à la
décomposition en produits de facteurs premiers du nombre 300 ?

#columns(3, gutter: 1em)[
+ $2^2 times 5 times 15$

+ $2 times 2 times 5 times 15$

+ $2^2 times 3 times 5^2$
]

#question[]

Décomposer : 96, 125, 64, 224, 195, 168, 196.
]

#exercise(title: [Problèmes classiques], difficulty: 0)[
Source des problèmes: #emph[Le Calcul Quotidien, G. Bodar, H. Bréjaud,
Collection Bodard]

#question[]

Le matin, on charge un distributeur automatique de 2000 billets de 10€
et de 750 billets de 20€. Au cours de la journée, 150 clients retirent
en moyenne 80€, dont la moitié en billets de 20€. Combien reste-t-il de
billets de 10€ et de 20€ à la fin de la journée dans ce distributeur ?
Source: ec56.org

#question[]

Une calculatrice électronique peut établir 2375 fiches à l’heure.
Combien en établit-elle en une journée pendant laquelle elle a
fonctionné durant 15h ? dans une année où elle a été utilisée 183 jours
dans les mêmes conditions ?

#question[]

Un câble est formé de 19 brins de 7 fils chacun. La longueur d’un fil
est de 1652 m. Quelle est la longueur totale de fil utilisé pour
constituer ce câble ?

#question[]

Une usine emploie 8 ingénieurs, 45 contremaîtres et 612 ouvriers. A la
fin de l’année, la direction répartit une participation aux bénéfices :
250 F par ouvrier, 460 F par contremaître et 1250 F par ingénieur.
Donner :

+ le montant total des sommes versées à ce titre au personnel;

+ le montant total des salaires pour l’année, en sachant qu’un salaire
  est versé 15 fois par an.

#question[]

Une voie ferrée simple est ainsi faite : de chaque côté on a aligné 2576
rails de 18 m chacun, supportés par des traverses.

+ Quelle est la longueur de la voie ferrée ? la longueur totale des
  rails utilisés ?

+ On compte 5 traverses pour 4 m de voie. Combien y a-t-il de traverses
  ?

+ Le rail est fixé à chaque traverse par 3 boulons. Combien a-t-on
  employé de boulons pour fixer la voie ferrée ?

#question[]

Quatre héritiers se partagent également le produit de la vente d’une
ferme. Les bâtiments et les terres ont été vendus 43 080 F, le bétail 10
450 F et le matériel 16 100 F. Mais les héritiers doivent payer 10 578 F
de frais de succession et 8 mois de salaire à 2 ouvriers payés 270 F par
mois. Quelle somme revient à chaque héritier ?

#question[]

32 personnes organisent un voyage pour lequel chacune doit payer 6,25 F.
Au dernier moment, plusieurs personnes ne peuvent venir et la part de
frais des autres est augmentée de 1,75 F. Combien de personnes se sont
retirées ?

#question[]

Deux trains partent à 5 h du matin, l’un de Paris pour Marseille,
l’autre de Marseille pour Paris. Le premier roule à 54 km/h de moyenne
le second à 36 km/h de moyenne

+ A quelle heure se rencontreront-ils?

+ A quelle distance de Paris se rencontreront-ils, sachant que Paris se
  trouve à 864 km de Marseille?
]

#answer[
#question[]

+ On calcule la quantité totale d’argent chargée :
  $2000 times 10 plus 750 times 20 eq 35 000$;

+ On calcule la somme totale d’argent retirée dans la journée :
  $150 times 80 eq 12000$;

+ La moitié de cette somme retirée, 6000 €, est constituée uniquement de
  billets de 20 €, donc l’autre moitié est constituée uniquement de
  billets de 10 €. On détermine leur quantité :

  - $6000 div 20 eq 300$

  - $6000 div 10 eq 600$

+ 300 billets de 20 € et 600 billets de 10 € ont été retirés.

+ On détermine le nombre de billets restants :

  - $750 minus 300 eq 450$

  - $2000 minus 600 eq 1400$

+ Il reste donc 450 billets de 20 € et 1400 billets de 10 €

#question[]

On effectue ici le calcul $2375 times 15 times 183$. On peut l’effectuer
dans n’importe quel ordre.

#align(center)[#multiplication(2375, 15)]

#align(center)[#multiplication(35625, 183)]

La calculatrice peut établir 35625 fiches par jour et 6519375 par an.

#question[]

+ On calcule la quantité totale de fils du câble : $19 times 7 eq 133$

+ Puis la longueur totale de fil :

  #align(center)[#multiplication(133, 1652)]

219716m de fils sont utilisés pour ce câble, ce qui correspond à
219,716km.

#question[]

On calcule séparément les montants de chaque catégorie, puis on en
effectue la somme

#align(center)[#multiplication(612, 250)]

#align(center)[#multiplication(45, 460)]

#align(center)[#multiplication(1250, 8)]

#align(center)[#addition(153000, 20700, 10000)]

Le montant total des sommes versées est de 183 700F. Pour déterminer la
masse salariale annuelle de l’entreprise, on multiple par 15 cette somme
:

#align(center)[#multiplication(183700, 15)]

La masse salariale annuelle payée est de 2755500 F.

#question[]

+ On détermine la longueur de la voie ferrée puis la longueur totale
  avec deux multiplications :

  #align(center)[#multiplication(2576, 18)]

  #align(center)[#multiplication(46368, 2)]

  Ainsi, la voie ferrée a une longueur de 46368m, ce qui correspond à
  une longueur total de rails de 92736m.

+ + On détermine le nombre d’intervalles de 4m :

    #align(center)[#division(46368, 4)]

  + Puis on multiplie ce nombre par le nombre de traverses tous les 4m,
    c’est-à-dire 5 :

    #align(center)[#multiplication(11592, 5)]

  + Il y a donc 57960 traverses au total sur cette voie ferrée.

+ Chaque traverse est liée aux deux rails par 6 boulons au total.

  #align(center)[#multiplication(57960, 6)]

  347760 boulons ont été employés pour cette voie ferrée.

#question[]

+ On calcule la somme totale de l’héritage :

  #align(center)[#addition(43080, 10450, 16100)]

+ On calcule à présent la somme totale à déduire de l’héritage.

  - Tout d’abord le total des salaires versés aux employés :
    $270 times 8 times 2 eq 270 times 16$.

    #align(center)[#multiplication(270, 16)]

  - On ajoute à cette somme les frais de succession :

    #align(center)[#addition(4320, 10578)]

    Au total, les héritiers devront déduire 14 898 F de l’héritage.

+ On calcule maintenant la somme restante :

  #align(center)[#soustraction(69630, 14898)]

+ Les 54732 F restants sont répartis équitablement parmi les 4 héritiers
  :

  #align(center)[#division(54732, 4)]

  Chaque héritier se verra attribuer la somme de 13683 F.

#question[]

On calcule la somme totale à payer pour le voyage :

#align(center)[#multiplication(32, 6.25)]

200 F sont payés pour le voyage, et on sait que chaque personne restante
paye désormais 8 F.

#align(center)[#division(200, 8)]

Il reste 25 personnes qui financent le voyage. On en déduit que 7
personnes se sont retirées.

#question[]

+ On se place dans un problème équivalent : les deux trains initialement
  écartés de 864 km se rapprochent de $54 plus 36 eq 90$ km par heure.
  Il suffit à présent de déterminer le temps nécessaire pour que la
  distance entre les deux devienne nulle.

  #align(center)[#division(864, 90)]

  Les deux trains se croiseront après $9 comma 6 h$ de trajet, soit 9
  heures et 36 minutes, à 14h36.

+ Pour répondre à cette question, on se place du point de vue du train
  partant de Paris. Au moment de l’intersection, il aura voyagé durant
  $9 comma 6 h$. En supposant que sa vitesse moyenne pendant ce morceau
  de trajet est également de 54km/h :

  #align(center)[#multiplication(54, 9.6)]

  Les deux trains se croiseront à 518,4km de Paris.
]

#exercise(title: [Calcul temporel], difficulty: 0)[
#question[]

Calculer:

+ $4 h 20 m i n plus 3 h 50 m i n$

+ $17 h 25 m i n minus 13 h 55 m i n$

+ $10 h 25 m i n plus 7 h 45 m i n plus 9 h 10 m i n$

#question[]

Combien de temps s’écoule...

+ entre le 15 septembre, 08h20 et le 16 septembre, 07h40 ?

+ entre le 13 septembre et le 13 octobre ?

+ entre le 17 octobre et le 17 novembre ?

#question[]

Décomposer les quantités temporelles ci-dessous, de l’unité donnée
jusqu’à l’année.

#columns(2, gutter: 1em)[
+ 395 secondes

+ 156 heures
#colbreak()
+ 1430 minutes

+ 1633026395 secondes
]

#question[]

Une montre retarde de 3 minutes en 5 jours. On la met à l’heure à 11 h
le dimanche. Quelle heure sera-t-il à la montre lorsque le mardi
suivant, il sera de nouveau 11 h ?

#definition[
Une année est bissextile si et seulement si une des deux propositions
suivantes est vérifiée:

- son année est divisible par 4 mais pas par 100;

- son année est divisible par 400.
]

#question[]

Une année qui n’est pas bissextile commence un jeudi. Quel jour de la
semaine seront le 14 juillet, le 1er octobre, le 11 novembre de cette
année et le 1er janvier de l’année suivante ?

#question[]

Sur la gauche d’un magazine « Le Petit Perroquet », on lit :

#emph[L’incontournable mensuel gratuit de Bastia et ses environs -
Octobre 2025 - n°197]

Quelle est la date du tout premier numéro ?
]

#answer[
On proposera une réponse détaillée des questions 3 et 4.

#strong[Question 4]

Entre dimanche 11h et mardi 11h s’écoulent 48 heures. D’après l’énoncé,
une montre retarde de 180 secondes en 5 jours. On en déduit donc qu’en 1
jour, la montre retarde de 36 secondes, et donc qu’en 2 jours, elle
retarde de 72 secondes soit 1 minute et 12 secondes. La montre affichera
alors `10h58min48sec`.

#strong[Question 5]

Le 1er janvier de cette année est un jeudi d’après l’énoncé. On compte
les jours de chaque mois, jusqu’à arriver au premier juillet :
$31 plus 28 plus 31 plus 30 plus 31 plus 30 eq 181$. Il y a 181 jours
entre le 1er janvier et le 1er juillet. Pour arriver au 14 juillet, on
ajoute 13 jours, soit un total de 194 jours. Une division par 7 donne le
nombre de semaines : $194 div 7 eq 27 med R 5$

27 semaines et 5 jours s’écoulent entre le 1er janvier et le 1er
juillet. On détermine le jour 5 jours après jeudi, et on conclut que le
14 juillet est un mardi.

On continue de compter pour atteindre le 1er octobre : du 14 juillet au
31 juillet, il y a 17 jours, et du 14 juillet au 1er août, il y a donc
18 jours. Du 1er août au 1er octobre, il y a $31 plus 30 eq 61$ jours.
Il y a donc 79 jours au total qui séparent ces deux dates, soit 11
semaines et 2 jours. Le jour venant 2 jours après le mardi est le jeudi.
Ainsi, le 1er octobre est un jeudi.

Du 1er octobre au 11 novembre, il y a $30 plus 10 eq 40$ jours, soit 5
semaines et 5 jours. Le jour venant 5 jours après le jeudi est le mardi,
donc le 11 novembre est un mardi.

Enfin, du 11 novembre au 1er janvier, il y a $21 plus 31 eq 52$ jours,
soit 7 semaines et 3 jours. Le jour venant 3 jours après le mardi, donc
le 1er janvier est un vendredi.
]

#exercise(title: [Calcul de dates], difficulty: 2)[
Pour en savoir davantage sur l’arithmétique modulaire utilisée, on
pourra consulter la page 5 du dossier #emph[Merveilleux nombres
premiers] de Jean-Paul Delahaye publié le 10 mai 2021 sur Futura
Sciences#footnote[Adresse et lien:
#link("https://www.futura-sciences.com/sciences/dossiers/mathematiques-merveilleux-nombres-premiers-1791/")].

#question[]

En considérant qu’on est le mardi, quel sera le jour de la semaine après
7 jours? 11 jours? 14 jours? 45 jours? 365 jours?

#question[]

L’an 2000 est-il bissextile? Que dire de l’an 2100 ?

Une méthode existe pour déterminer relativement rapidement le jour d’une
date quelconque. En notant respectivement $J comma M$ et $A$ le jour du
mois, le code du mois et le code de l’année, alors le jour de cette date
est le résultat du reste de la division euclidienne de $J plus M plus A$
par 7.

Les codes des années 2000, 2001, 2002 et 2003 sont respectivement 0,1,2
et 3. Le code est augmenté de 1 chaque année, et 2 pour chaque année
bissextile. Cependant, pour éviter d’avoir à traiter des nombres trop
grands, on prend uniquement le reste de la division euclidienne de ce
nombre par 7. Ainsi, le code de 2004 sera 5, celui de 2005 sera 6, et
celui de 2006 sera 7, ce qui revient à avoir un code de 0.

#figure(
  grid(
    columns: (1fr, 1fr),
    gutter: 1em,
    table(
      columns: 2,
      align: center,
      stroke: 0.5pt,
      table.header([*Jour*], [*Nombre correspondant*]),
      [lundi], [1], [mardi], [2], [mercredi], [3], [jeudi], [4],
      [vendredi], [5], [samedi], [6], [dimanche], [0],
    ),
    table(
      columns: 2,
      align: center,
      stroke: 0.5pt,
      table.header([*Mois*], [*Code*]),
      [janvier], [6], [février], [2], [mars], [2], [avril], [5],
      [mai], [0], [juin], [3], [juillet], [5], [août], [1],
      [septembre], [4], [octobre], [6], [novembre], [2], [décembre], [4],
    ),
  ),
  caption: [Association d’un nombre à chaque jour et chaque mois.],
) <fig:association>

#question[]

Déterminer les jours des dates suivantes avec cette technique :

#columns(4, gutter: 1em)[
- 4 mai 2001

- 7 juillet 2007

- 27 octobre 2014

- 24 février 2022
]

Les articles Internet suivants proposent une présentation plus fournie
de cette technique de calcul :

- van Neerden, T. (2015, 23 mai). \[Geek\] Calculer le jour de la
  semaine pour n’importe quel date, de tête. Le Hollandais Volant.

- Cram, S. (2011, 1 mars). Day of the Week For Any Date (Revised).
]

#exercise(title: [Nombres premiers], difficulty: 0)[
#definition[
Un nombre est premier si et seulement s’il admet exactement 2 diviseurs
distincts.
]

Ainsi, $2$, $5$, $31$ sont des nombres premiers :

- $2$ est divisible par $1$ et par $2$;

- $5$ n’est pas divisible par $2 comma 3$ et $4$;

- Pour $31$, on vérifie la non-divisibilité des nombres entre 2 et 6 et
  on confirme qu’il est bien premier.

Pour montrer qu’un nombre $n$ est premier, il faut vérifier que les
seuls diviseurs possibles sont $1$ et $n$, donc que les nombres de $2$ à
$n minus 1$ ne soient pas des diviseurs de $n$. Il est possible
d’effectuer une vérification plus rapide avec une technique expliquée
par l’exemple ci-dessous: $ 60 & eq 1 times 60\
 & eq 2 times 30\
 & eq 3 times 20\
 & eq 4 times 15\
 & eq 5 times 12\
 & eq 6 times 10\
 & eq 10 times 6\
 & eq 12 times 5\
 & eq 15 times 4\
 & eq 20 times 3\
 & eq 30 times 2\
 & eq 60 times 1 $

On remarque qu’après avoir déterminé la divisibilité par 6, on peut
déterminer la liste entière des diviseurs. Cela est dû au simple fait
qu’en trouvant un multiple, on en donne également un autre. En dépassant
la racine carrée de 60 (qu’on arrondit ici à 8), on ne fait que
déterminer des multiples qu’on a déjà écrits.

Ainsi, pour montrer qu’un nombre $n$ est premier, on vérifie que les
nombres de $2$ à $sqrt(n)$ ne sont pas des diviseurs de $n$.

Avec cette méthode, vérifier la primalité des nombres 37, 47, 57, 67,
77, 87 et 97.
]

#exercise(title: [Crible d'Eratosthène], difficulty: 0)[
Le crible d’Eratosthène est une méthode permettant de déterminer tous
les nombres premiers de 2 jusqu’à un entier $n$ fixé. Voici comment il
fonctionne:

- On écrit tous les nombres concernés;

- On barre 1 car ce n’est pas un nombre premier;

- Tant qu’un nombre supérieur à la racine carrée de $n$ n’a pas été
  entouré:

  - on entoure le prochain nombre de la liste;

  - on élimine tous ses multiples.

- Une fois fini, on entoure tous les nombres restants. Ces nombres sont
  donc premiers.

A partir des indications, déterminer l’ensemble des nombres premiers de 1 à 100.

#figure(
  align(center)[#image("images/crible.png", width: 80%)],
  caption: [Le crible d’Ératosthène.],
) <fig:crible>
]
