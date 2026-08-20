// Server-side source of truth for the menu — prices are never trusted from the client.
const MENU = {
  entrees: [
    { id: 'e1', name: "Soupe à l'Oignon", desc: 'Classic French onion soup, gruyère crouton', price: 9.5 },
    { id: 'e2', name: 'Escargots de Bourgogne', desc: 'Snails in garlic parsley butter', price: 12.0 },
    { id: 'e3', name: 'Salade Niçoise', desc: 'Tuna, olives, egg, green beans, anchovy', price: 11.0 },
    { id: 'e4', name: 'Pâté de Campagne', desc: 'Country-style pork pâté, cornichons, toast', price: 10.5 },
  ],
  plats: [
    { id: 'p1', name: 'Coq au Vin', desc: 'Braised chicken in red wine, mushrooms, lardons', price: 22.0 },
    { id: 'p2', name: 'Boeuf Bourguignon', desc: 'Slow-braised beef in burgundy wine sauce', price: 24.0 },
    { id: 'p3', name: 'Ratatouille', desc: 'Provençal stewed vegetables (vegetarian)', price: 17.0 },
    { id: 'p4', name: 'Steak Frites', desc: 'Grilled steak, herb butter, hand-cut fries', price: 25.0 },
    { id: 'p5', name: 'Confit de Canard', desc: 'Duck leg confit, garlic potatoes', price: 23.5 },
    { id: 'p6', name: 'Quiche Lorraine', desc: 'Bacon and gruyère tart, side salad', price: 16.0 },
  ],
  desserts: [
    { id: 'd1', name: 'Crème Brûlée', desc: 'Vanilla custard, caramelized sugar crust', price: 8.5 },
    { id: 'd2', name: 'Tarte Tatin', desc: 'Upside-down caramelized apple tart', price: 9.0 },
    { id: 'd3', name: 'Mousse au Chocolat', desc: 'Dark chocolate mousse, chantilly cream', price: 8.0 },
    { id: 'd4', name: 'Profiteroles', desc: 'Choux pastry, vanilla ice cream, chocolate sauce', price: 9.5 },
  ],
  boissons: [
    { id: 'b1', name: 'Verre de Vin Rouge', desc: 'House red wine, glass', price: 8.0 },
    { id: 'b2', name: 'Verre de Vin Blanc', desc: 'House white wine, glass', price: 8.0 },
    { id: 'b3', name: 'Kir Royal', desc: 'Champagne with crème de cassis', price: 10.0 },
    { id: 'b4', name: 'Café / Espresso', desc: 'Freshly brewed', price: 3.5 },
  ],
};

const ITEMS_BY_ID = new Map();
for (const category of Object.values(MENU)) {
  for (const item of category) ITEMS_BY_ID.set(item.id, item);
}

function getItem(id) {
  return ITEMS_BY_ID.get(id) || null;
}

module.exports = { MENU, getItem };
