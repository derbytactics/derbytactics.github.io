/** Iconos vectoriales: se ven igual en iPhone, Android y web (a diferencia de los emojis). */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { C } from './theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 16, color = C.text, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} accessibilityElementsHidden importantForAccessibility="no" />;
}

/** Iconos con significado propio en el juego. */
export const I = {
  attack: 'sword',
  defense: 'shield',
  dice: 'dice-5',
  trophy: 'trophy',
  ball: 'soccer',
  goal: 'soccer-field',
  save: 'hand-back-left',
  concede: 'emoticon-sad',
  var: 'television-classic',
  card: 'cards-playing',
  injury: 'bandage',
  yellow: 'card',
  streak: 'fire',
  locked: 'lock',
  shielded: 'shield-check',
  closedDoors: 'door-closed-lock',
  clubDay: 'party-popper',
  subsidy: 'crane',
  scout: 'binoculars',
  warning: 'alert',
  stop: 'hand-back-right',
  news: 'bullhorn',
  soundOn: 'volume-high',
  soundOff: 'volume-off',
  cloud: 'cloud-upload',
  club: 'shield-star',
  history: 'history',
  help: 'help-circle',
  timer: 'timer-outline',
  skip: 'fast-forward',
  medal: 'medal',
  error: 'emoticon-frown',
} as const satisfies Record<string, IconName>;
