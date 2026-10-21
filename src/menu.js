/**
 * Deen's Coffee Shop — full menu, transcribed from Deens-Coffee-Shop-Menu.pdf
 *
 * Each item: [name, priceSize1, priceSize2]   (null = size not available, shown as "-" in the PDF)
 * Single-price categories use [name, price].
 * An item group can override the category sizes (e.g. the 400/500 ml hot drinks in Latte & Hot).
 */

export const WHATSAPP_NUMBER = '96170991995'; // +961 70 991 995
export const CURRENCY = '$';

export const categories = [
  {
    id: 'espresso',
    name: 'Espresso & Short Milk',
    short: 'Espresso',
    tagline: 'Pure, bold, pulled to perfection.',
    image: '/images/golden-cup.webp',
    focus: '50% 40%',
    groups: [
      {
        sizes: ['8oz', '12oz'],
        items: [
          ['Espresso', 3, null],
          ['Americano', 3.55, 4.22],
          ['V60', null, 6.11],
          ['Macchiato', 3.88, null],
          ['Piccolo', 3.77, null],
          ['Cortado', 4, null],
        ],
      },
    ],
  },
  {
    id: 'latte-hot',
    name: 'Latte & Hot Beverages',
    short: 'Latte & Hot',
    tagline: 'Velvet milk, warm souls.',
    image: '/images/sip-chill-repeat.webp',
    focus: '50% 70%',
    groups: [
      {
        sizes: ['8oz', '12oz'],
        items: [
          ['Caramel Macchiato', 5, 5.55],
          ['Cappuccino', 4.44, 5],
          ['Mochaccino', 5, 6.11],
          ['White Mocha Latte', 5, 6.11],
          ['Latte', 5, 5.55],
          ['Caramel Latte', 5, 5.55],
          ['Vanilla Latte', 5, 5.55],
          ['Crème Brûlée Latte', 5, 5.55],
          ['Toffee Nut', 5, 5.55],
          ['Spanish Latte', 5, 5.55],
          ['Irish Latte', 5, 5.55],
          ['Cinnamon Latte', 5, 5.55],
          ['Salted Caramel Latte', 5, 5.55],
          ['Macchiato Latte', 5, 5.55],
        ],
      },
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Flat White', 4.4, 5],
          ['Hot Chocolate', 5, 5.5],
          ['Hot Chocolate Panna', 5.5, 6.11],
          ['Flavored Tea', 3, null],
          ['Toffifo', 5.55, 6.11],
          ['Hot Lotus', 5.55, 6.11],
        ],
      },
    ],
  },
  {
    id: 'frappe',
    name: 'Frappe',
    short: 'Frappe',
    tagline: 'Blended, iced, irresistible.',
    image: '/images/frappe-pour.webp',
    focus: '50% 45%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Caramel Frappe', 5, 5.55],
          ['Vanilla Frappe', 5, 5.55],
          ['Mocha Frappe', 5.55, 6.11],
          ['White Mocha Frappe', 5.55, 6.11],
          ['Toffee Nut Frappe', 5, 5.55],
          ['Coconut Frappe', 5, 5.55],
          ['Salted Caramel Frappe', 5, 5.55],
          ['Espresso Frappe', 5, 5.55],
          ['Crème Brûlée Frappe', 5, 5.55],
          ['Lotus Frappe', 5.55, 6.11],
          ['Cinnamon Roll Frappe', 5.55, 6.11],
          ["Deen's Frappe", 5.55, 6.11],
        ],
      },
    ],
  },
  {
    id: 'iced-coffee',
    name: 'Iced Coffee',
    short: 'Iced Coffee',
    tagline: 'Chilled, smooth, over ice.',
    image: '/images/iced-latte.webp',
    focus: '40% 50%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Iced Caramel', 4.88, 5.22],
          ['Iced Vanilla', 4.88, 5.22],
          ['Iced Mocha', 5.22, 5.77],
          ['Iced White Mocha', 5.22, 5.77],
          ['Iced Toffee Nut', 4.88, 5.22],
          ['Iced Coconut', 4.88, 5.22],
          ['Iced Salted Caramel', 4.88, 5.22],
          ['Iced Crème Brûlée', 4.88, 5.22],
          ['Iced Spanish', 4.88, 5.22],
          ['Iced Caramelized Honey', 4.88, 5.22],
          ['Iced Caramel Macchiato', 5.22, 5.77],
          ['Iced Americano', 3.8, 4.44],
          ['Iced Tiramisu', 5.22, 5.77],
          ['Iced Latte', 4.44, 4.88],
          ['Iced Cinnamon', 4.88, 5.22],
          ['Iced Irish', 4.88, 5.22],
          ['Iced Latte Ginger Bread', 4.88, 5.22],
          ['Iced Pistachio', 5.22, 5.77],
        ],
      },
    ],
  },
  {
    id: 'matcha',
    name: 'Matcha',
    short: 'Matcha',
    tagline: 'Ceremonial green, modern soul.',
    image: '/images/matcha.webp',
    focus: '50% 45%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Iced Matcha', 5.22, 5.77],
          ['Matcha Latte', 5.55, 6.11],
          ['Matcha Frappe', 5.55, 6.11],
          ['Iced Strawberry Matcha', 5.77, 6.22],
        ],
      },
    ],
  },
  {
    id: 'milkshakes',
    name: 'Milkshakes',
    short: 'Milkshakes',
    tagline: 'Thick, creamy, unapologetic.',
    image: '/images/milkshakes.webp',
    focus: '50% 40%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Caramel', 5, 5.55],
          ['Vanilla', 5, 5.55],
          ['Oreo', 5.22, 6.11],
          ['Toffee Nut', 5, 5.55],
          ['Tutti Frutti', 5.55, 6.11],
          ['Banana & Honey', 5, 5.5],
          ['Lotus', 5.55, 6.11],
          ['Nutella', 5.55, 6.11],
          ['Pistachio', 5.55, 6.11],
          ['Chocolate', 5, 5.55],
          ['Strawberry', 5, 5.55],
          ['Cookies & Cream', 5, 5.55],
          ['Pina Colada', 5, 5.55],
        ],
      },
    ],
  },
  {
    id: 'refreshers',
    name: 'Refreshers',
    short: 'Refreshers',
    tagline: 'Vivid colors, cool sips.',
    image: '/images/refreshers.webp',
    focus: '50% 35%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Iced Ube', 5, 5.55],
          ['Mango Acai', 5, 5.55],
          ['Strawberry Lavender', 4.44, 5],
          ["Deen's Blue", 4.44, 5],
          ["Deen's Wave", 4.44, 5],
          ['Passion Fusion', 4.44, 5],
          ['Red Diamond', 4.44, 5],
        ],
      },
    ],
  },
  {
    id: 'smoothies',
    name: 'Smoothies',
    short: 'Smoothies',
    tagline: 'Real fruit, blended bright.',
    image: '/images/smoothies.webp',
    focus: '48% 50%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Mango', 5, 5.55],
          ['Strawberry', 5, 5.55],
          ['Peach', 5, 5.55],
          ['Blueberry', 5, 5.55],
          ['Passion Fruit', 5, 5.55],
          ['Tropical Fruit', 5.55, 6.11],
          ['Sour Apple', 5, 5.55],
        ],
      },
    ],
  },
  {
    id: 'iced-tea',
    name: 'Iced Tea',
    short: 'Iced Tea',
    tagline: 'Brewed, chilled, fruit-kissed.',
    image: '/images/iced-tea.webp',
    focus: '50% 45%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Mixed Berries', 4.44, 5],
          ['Apple', 4, 4.66],
          ['Peach', 4, 4.66],
          ['Mango', 4, 4.66],
          ['Kiwi', 4, 4.66],
          ['Passion', 4, 4.66],
          ['Lemon', 4, 4.66],
          ['Strawberry Mango', 4.44, 5],
        ],
      },
    ],
  },
  {
    id: 'fresh-juices',
    name: 'Fresh Juices',
    short: 'Fresh Juices',
    tagline: 'Squeezed fresh, served cold.',
    image: '/images/green-slush.webp',
    focus: '50% 40%',
    groups: [
      {
        sizes: ['400 ml', '500 ml'],
        items: [
          ['Lemonade', 4, 4.66],
          ['Minted Lemonade', 4.44, 5],
          ['Pink Lemonade', 4.44, 5],
          ['Watermelon Lemonade', 5, 5.5],
        ],
      },
    ],
  },
  {
    id: 'snacks',
    name: 'Snacks',
    short: 'Snacks',
    tagline: 'Flaky, fresh, made to pair.',
    image: '/images/croissant.webp',
    focus: '55% 55%',
    groups: [
      {
        sizes: null,
        items: [
          ['Zaatar Croissant', 3.77],
          ['Cheese Croissant', 4.4],
          ['Chocolate Croissant', 4.4],
          ['Chicken Pasta', 8.8],
          ['Chicken Caesar Salad', 8.8],
          ['Tuna Sandwich', 5.55],
          ['Turkey & Cheese Sandwich', 5.55],
          ['Chicken Sandwich', 5.55],
        ],
      },
    ],
  },
  {
    id: 'desserts',
    name: 'Desserts',
    short: 'Desserts',
    tagline: 'A sweet ending, every time.',
    image: '/images/carrot-cake.webp',
    focus: '45% 60%',
    groups: [
      {
        sizes: null,
        items: [
          ['Carrot Cake', 5],
          ['Lazy Cake', 5],
          ['Cheese Cake', 5],
          ['Chocolate Cake', 5],
          ['Red Velvet Cake', 5],
          ['Cookies Cake', 5],
          ['Brookie Cake', 5],
          ['Oreo Cake', 5],
          ['Lotus Cake', 5],
          ['Cortina Cake', 5],
          ['Dubai Cake', 5],
          ['Ferrero Cake', 5],
          ['Honey Cake', 5],
          ['Japanese Cake', 6.11],
          ['Pistachio Cake', 5],
          ['Saint Sebastian Cake', 5.55],
          ['Cookies', 3.33],
          ['Tiramisu', 5],
          ['Muffin', 4.44],
          ['Brownie', 4.4],
          ['Fondant', 6.66],
        ],
      },
    ],
  },
  {
    id: 'additions',
    name: 'Additions',
    short: 'Additions',
    tagline: 'Make it exactly yours.',
    note: "Customize any drink or snack with add-ons. Specify in your checkout notes which item you'd like it added to!",
    image: '/images/mocha-frappe.webp',
    focus: '40% 40%',
    groups: [
      {
        sizes: null,
        items: [
          ['Espresso Shot', 1.11],
          ['Decaf Option', 1.11],
          ['Extra Syrup / Flavor', 1.11],
          ['Sugar-Free Flavor', 0.5],
          ['Oat / Almond / Coconut Milk', 1.11],
          ['Condensed Milk (Nestle)', 1.11],
          ['Whipped Cream', 1.11],
          ['Marshmallows', 1.11],
          ['Game', 2.2],
        ],
      },
    ],
  },
  {
    id: 'water',
    name: 'Water',
    short: 'Water',
    tagline: 'Still or sparkling.',
    image: '/images/sparkling-water.webp',
    focus: '50% 50%',
    groups: [
      {
        sizes: null,
        items: [
          ['Sparkling Water', 2.77],
          ['Water', 1],
        ],
      },
    ],
  },
];

/** Flatten to a normalized list used by the UI & cart. */
export function buildMenu(cats = categories) {
  return cats.map((cat) => ({
    ...cat,
    items: (cat.groups || []).flatMap((g, gi) =>
      (g.items || []).map(([name, ...prices], ii) => {
        const options = g.sizes
          ? g.sizes
              .map((label, si) => ({ label, price: prices[si] }))
              .filter((o) => o.price != null)
          : [{ label: null, price: prices[0] }];
        return {
          id: `${cat.id}-${gi}-${ii}`,
          name,
          category: cat.name,
          categoryId: cat.id,
          sizes: g.sizes,
          options,
        };
      })
    ),
  }));
}

export const formatPrice = (n) => {
  const fixed = Math.round(n * 100) / 100;
  return CURRENCY + (Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(2));
};
