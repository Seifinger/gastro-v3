import * as heroFullbleed from './hero-fullbleed/index.js';
import * as heroSplit from './hero-split/index.js';
import * as heroTypographic from './hero-typographic/index.js';
import * as heroVideo from './hero-video/index.js';
import * as heroEditorial from './hero-editorial/index.js';
import * as storyFounder from './story-founder/index.js';
import * as storyTimeline from './story-timeline/index.js';
import * as storyManifesto from './story-manifesto/index.js';
import * as dishHero from './dish-hero/index.js';
import * as dishIngredients from './dish-ingredients/index.js';
import * as menuList from './menu-list/index.js';
import * as menuCards from './menu-cards/index.js';
import * as menuBoard from './menu-board/index.js';
import * as galleryMosaic from './gallery-mosaic/index.js';
import * as galleryStrip from './gallery-strip/index.js';
import * as gallerySingle from './gallery-single/index.js';
import * as testimonialSolo from './testimonial-solo/index.js';
import * as testimonialGrid from './testimonial-grid/index.js';
import * as reservationForm from './reservation-form/index.js';
import * as orderEmbed from './order-embed/index.js';

import metaHeroFullbleed from './hero-fullbleed/meta.json' with { type: 'json' };
import metaHeroSplit from './hero-split/meta.json' with { type: 'json' };
import metaHeroTypographic from './hero-typographic/meta.json' with { type: 'json' };
import metaHeroVideo from './hero-video/meta.json' with { type: 'json' };
import metaHeroEditorial from './hero-editorial/meta.json' with { type: 'json' };
import metaStoryFounder from './story-founder/meta.json' with { type: 'json' };
import metaStoryTimeline from './story-timeline/meta.json' with { type: 'json' };
import metaStoryManifesto from './story-manifesto/meta.json' with { type: 'json' };
import metaDishHero from './dish-hero/meta.json' with { type: 'json' };
import metaDishIngredients from './dish-ingredients/meta.json' with { type: 'json' };
import metaMenuList from './menu-list/meta.json' with { type: 'json' };
import metaMenuCards from './menu-cards/meta.json' with { type: 'json' };
import metaMenuBoard from './menu-board/meta.json' with { type: 'json' };
import metaGalleryMosaic from './gallery-mosaic/meta.json' with { type: 'json' };
import metaGalleryStrip from './gallery-strip/meta.json' with { type: 'json' };
import metaGallerySingle from './gallery-single/meta.json' with { type: 'json' };
import metaTestimonialSolo from './testimonial-solo/meta.json' with { type: 'json' };
import metaTestimonialGrid from './testimonial-grid/meta.json' with { type: 'json' };
import metaReservationForm from './reservation-form/meta.json' with { type: 'json' };
import metaOrderEmbed from './order-embed/meta.json' with { type: 'json' };

export const blueprints = {
  'hero-fullbleed': { ...heroFullbleed, meta: metaHeroFullbleed },
  'hero-split': { ...heroSplit, meta: metaHeroSplit },
  'hero-typographic': { ...heroTypographic, meta: metaHeroTypographic },
  'hero-video': { ...heroVideo, meta: metaHeroVideo },
  'hero-editorial': { ...heroEditorial, meta: metaHeroEditorial },
  'story-founder': { ...storyFounder, meta: metaStoryFounder },
  'story-timeline': { ...storyTimeline, meta: metaStoryTimeline },
  'story-manifesto': { ...storyManifesto, meta: metaStoryManifesto },
  'dish-hero': { ...dishHero, meta: metaDishHero },
  'dish-ingredients': { ...dishIngredients, meta: metaDishIngredients },
  'menu-list': { ...menuList, meta: metaMenuList },
  'menu-cards': { ...menuCards, meta: metaMenuCards },
  'menu-board': { ...menuBoard, meta: metaMenuBoard },
  'gallery-mosaic': { ...galleryMosaic, meta: metaGalleryMosaic },
  'gallery-strip': { ...galleryStrip, meta: metaGalleryStrip },
  'gallery-single': { ...gallerySingle, meta: metaGallerySingle },
  'testimonial-solo': { ...testimonialSolo, meta: metaTestimonialSolo },
  'testimonial-grid': { ...testimonialGrid, meta: metaTestimonialGrid },
  'reservation-form': { ...reservationForm, meta: metaReservationForm },
  'order-embed': { ...orderEmbed, meta: metaOrderEmbed },
};

export function getBlueprint(id) {
  const bp = blueprints[id];
  if (!bp) throw new Error(`Unbekannter Blueprint "${id}"`);
  return bp;
}
