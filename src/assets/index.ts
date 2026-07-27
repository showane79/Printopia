// Central barrel for all inlined image assets.
// Imported here (rather than public/) so vite-plugin-singlefile inlines them.
import hero from "./hero.jpg";
import actionFigure from "./action-figure.jpg";
import fantasyFigure from "./fantasy-figure.jpg";
import planter from "./planter.jpg";
import gaming from "./gaming.jpg";
import deskOrganizer from "./desk-organizer.jpg";
import phoneHolder from "./phone-holder.jpg";
import keychain from "./keychain.jpg";
import customGift from "./custom-gift.jpg";

export const images = {
  hero,
  actionFigure,
  fantasyFigure,
  planter,
  gaming,
  deskOrganizer,
  phoneHolder,
  keychain,
  customGift,
};

export type ImageKey = keyof typeof images;
