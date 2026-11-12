import {
  Repeat, Car, BookOpen, ShoppingCart, UtensilsCrossed, Briefcase, Banknote, ShieldPlus, PawPrint, Baby, Shirt, Sparkles,
  CreditCard, House, HandHeart, Receipt, Zap, Flame, Wifi, Tv, Smartphone, Droplets, Plane, Ticket, Store, Hammer, Tag,
  HandCoins, Handshake, PiggyBank, Globe, Landmark, Lightbulb, Gift, GraduationCap, Fuel, Bus, Dumbbell, Coffee, Music,
  Gamepad2, Pill, Scissors, Wrench, Phone, Cake, Package, Truck, Heart, Wallet, TrendingUp, Percent, Users, Laptop, ArrowLeftRight
} from 'lucide-react';

/** Icônes proposées pour les catégories (clé stockée dans category.iconKey). */
export const CATEGORY_ICON_SET = {
  repeat: Repeat, car: Car, book: BookOpen, cart: ShoppingCart, food: UtensilsCrossed, briefcase: Briefcase, banknote: Banknote,
  health: ShieldPlus, paw: PawPrint, baby: Baby, shirt: Shirt, sparkles: Sparkles, card: CreditCard, house: House,
  charity: HandHeart, receipt: Receipt, zap: Zap, flame: Flame, wifi: Wifi, tv: Tv, phone: Smartphone, water: Droplets,
  plane: Plane, ticket: Ticket, store: Store, hammer: Hammer, tag: Tag, borrow: HandCoins, lend: Handshake,
  piggy: PiggyBank, globe: Globe, bank: Landmark, bulb: Lightbulb, gift: Gift, school: GraduationCap, fuel: Fuel,
  bus: Bus, sport: Dumbbell, coffee: Coffee, music: Music, game: Gamepad2, pill: Pill, scissors: Scissors,
  wrench: Wrench, landline: Phone, cake: Cake, parcel: Package, truck: Truck, heart: Heart, wallet: Wallet,
  invest: TrendingUp, percent: Percent, family: Users, laptop: Laptop, transfer: ArrowLeftRight
};

export function categoryIcon(category) {
  return CATEGORY_ICON_SET[category?.iconKey] || null;
}
