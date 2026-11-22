/**
 * Módulo nativo de partidas sin internet (solo iPhone, con Multipeer Connectivity).
 * En web, Android o en una app compilada sin él, vale null y la opción no aparece.
 */
import { requireOptionalNativeModule } from 'expo';
import type { NearbyNative } from '../../src/net/nearby';

export default requireOptionalNativeModule<NearbyNative>('DerbyNearby');
