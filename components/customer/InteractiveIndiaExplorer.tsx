import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/packageUtils';

export interface CircuitDestination {
  id: string;
  name: string;
  tagline: string;
  category: 'spiritual' | 'himalayas' | 'coastal' | 'royal' | 'weekend';
  categoryLabel: string;
  departureHubs: string[];
  x: number; // SVG % or coordinate (0-500)
  y: number; // SVG % or coordinate (0-580)
  duration: string;
  price: number;
  image: string;
  packageId?: string;
  circuitCities: string[];
  highlights: string[];
  bestSeason: string;
}

const DEFAULT_FALLBACK_IMG = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80';

// Official Survey of India (SoI) geographic vector boundary (simplified via Douglas-Peucker)
const INDIA_ACCURATE_PATH = "M 171.4 58.2 L 174 58.9 L 175.9 57.5 L 177.3 58.7 L 177.7 56.7 L 181 56.9 L 182.3 53.3 L 190.7 50.4 L 191.5 48.2 L 194.1 49.5 L 198.8 47.9 L 200.3 48.3 L 201 50.8 L 202.3 49.8 L 204.3 55.1 L 208.7 55.8 L 209.5 59.5 L 211.8 56.4 L 214.9 58.4 L 213 60.9 L 211.8 70.3 L 209.8 74 L 205.5 75.6 L 205.6 78.5 L 201.3 79.1 L 202.8 83.4 L 201.1 84.3 L 199.7 88.1 L 193.6 87.4 L 192 88.7 L 195 95.4 L 192.3 95.7 L 192.8 100.5 L 195.3 104.1 L 199.8 104.3 L 198.7 108 L 202.1 112.8 L 201.9 114.4 L 199.9 117.5 L 197.8 116.8 L 193.2 121.1 L 190.4 118.3 L 189.8 114 L 184.6 117.3 L 186 122.3 L 190.4 127.8 L 189.2 131.5 L 191.4 135.3 L 189.5 137.3 L 190.6 138.5 L 190.4 141.1 L 192.2 141.5 L 195.2 138.3 L 200.1 146.7 L 202.7 148.3 L 206.7 147.7 L 212.3 151.7 L 212 155.2 L 224.2 161.6 L 223.7 162.8 L 222.4 162.1 L 219.9 166.3 L 214.2 171.2 L 214.8 174.1 L 212.4 177 L 213.2 181.5 L 210.9 183.4 L 209.8 188.7 L 216.5 193.9 L 216.3 191.8 L 217.2 191.3 L 226.9 197.5 L 228.5 201.8 L 230.4 201.3 L 237 207 L 239.8 205.7 L 245.5 210.3 L 249.4 209.5 L 249.8 213.6 L 256.6 214.5 L 258.5 216.8 L 259.6 214 L 263 214.2 L 266.7 216.5 L 266.5 214.7 L 269.1 214.9 L 271 213.3 L 273.2 215.8 L 278.1 216.7 L 279.1 218.9 L 278.4 222.1 L 283.2 223.7 L 284.1 225.7 L 286.7 225.4 L 287 227.5 L 293.2 225.3 L 296.6 231 L 299.2 229.2 L 303.8 230 L 309.8 233.7 L 314.9 230.7 L 315.2 233.2 L 318.9 235.1 L 320.8 233.4 L 322.9 234.5 L 327.2 232.5 L 329 234.8 L 331.6 227.8 L 330.9 223.2 L 328.6 220.7 L 329.5 213.7 L 331.8 208.2 L 330.6 205.8 L 338.4 202.1 L 341.4 204 L 342.2 207 L 340.3 212.4 L 342.6 217.6 L 340 220.3 L 341.9 220.9 L 342 224 L 342.7 223.1 L 345.9 226.5 L 349.5 225.5 L 353.6 227.1 L 353.3 228.1 L 356.8 228.5 L 361.8 227.2 L 364.2 224.8 L 369.6 227.2 L 384.2 226.6 L 387.3 224.4 L 389.8 225.8 L 390.7 223.7 L 389.4 221.5 L 389.5 218.2 L 390.8 217.6 L 389.2 214 L 383.7 214 L 382.3 211.2 L 383.5 208.8 L 387.8 209.6 L 392.6 206.4 L 393.7 208.1 L 395.8 208.2 L 399.9 204.7 L 399.1 201.4 L 402.7 200.5 L 410.3 191.8 L 414.6 191.8 L 422.9 186.7 L 424.4 184.9 L 423.3 182.5 L 428.3 179.8 L 429.4 179.4 L 431.1 182.3 L 437.9 184.1 L 440.5 181.8 L 441.5 183 L 443.1 180.9 L 444.6 181.5 L 446.2 178.8 L 449.8 178.2 L 453.5 181.8 L 451.8 184.7 L 453.9 183.3 L 458.5 190.5 L 455.1 194.8 L 456.5 196.2 L 456.4 194.1 L 459.7 192.8 L 462.9 197.6 L 465.9 197.5 L 469.4 200.4 L 468.7 203.1 L 469.9 204.1 L 469.5 206.6 L 467.7 206.2 L 462.3 211.7 L 462.5 214.5 L 466.1 221.3 L 462 219.5 L 462.3 218.1 L 459.6 216 L 452.4 217.8 L 440.4 228.5 L 436.2 230.1 L 434.9 233.2 L 435.9 234.5 L 435.7 239.6 L 436.7 240.1 L 434.1 243.4 L 434.7 245.9 L 432.4 249.5 L 428.5 252.6 L 427.6 255.9 L 430.1 257.5 L 429.7 261 L 424.9 269.3 L 421.3 280.8 L 416.1 279.4 L 415.3 278 L 411.5 279.1 L 408.9 276.6 L 410.5 283.7 L 409.3 289.8 L 409.7 293.7 L 408.3 296 L 405.8 295.3 L 405.5 304.6 L 407 309.4 L 406.2 310.9 L 404.5 310.6 L 404 314.3 L 403.2 313.5 L 402.5 315.1 L 401.9 313 L 399.4 311.3 L 399.1 313.9 L 398 314.5 L 396.7 301.1 L 394.5 297.3 L 394.1 291.9 L 395 291.8 L 393.1 283.2 L 392.1 284.4 L 391.1 282.9 L 389.6 284.5 L 388.3 282.9 L 388.5 287.5 L 385.3 290.7 L 386.4 294.5 L 383.2 297.3 L 380.1 291 L 380.2 295 L 379.1 294.3 L 378.7 289.6 L 376.3 285.1 L 377.4 279.4 L 379.6 278.5 L 379.5 276.1 L 382.7 276.7 L 383.9 273.8 L 385.3 275.5 L 385.1 273.6 L 387.4 275.6 L 387.7 271.9 L 391.4 270.5 L 393.4 264.7 L 392.4 261.7 L 396.4 262.1 L 395.3 259.3 L 389.8 256.4 L 383.5 257.6 L 377.9 256.1 L 365.5 257.2 L 356.4 254.5 L 357.1 248.5 L 356.1 244.9 L 357.2 242.5 L 356.3 242.5 L 356.9 241.8 L 354.1 237.1 L 352.7 238.6 L 353.6 240.3 L 352.5 242.1 L 350.2 240.6 L 349.2 241.3 L 346.2 238.9 L 345.2 234.1 L 343.2 233 L 342.4 233.9 L 344.6 237 L 342.3 236.2 L 341.5 237.2 L 340.8 235.8 L 338.8 236.6 L 340 235.1 L 334.8 229.9 L 333.8 232.6 L 336.1 233 L 336.7 234.8 L 331.5 238.8 L 330.4 244.9 L 332.9 245 L 336.9 250.5 L 341 250.3 L 341.5 253.2 L 344 255 L 342.7 256.8 L 335.5 256 L 334.8 260.9 L 333.8 262.2 L 332.2 260.6 L 330.9 261 L 331.5 262.4 L 329 265.9 L 333.9 271.1 L 339.9 273 L 339.3 275.9 L 340.4 278.4 L 337.5 280.6 L 337.2 284.4 L 340.9 287.2 L 339.6 291.5 L 343.8 292.3 L 341.5 296 L 343.4 298.9 L 342.9 304 L 345.3 311.3 L 344.8 315.2 L 344.1 314.5 L 343.6 315.9 L 345.4 320.6 L 342.7 320.7 L 341.8 318.1 L 341.6 320.9 L 339.7 319.8 L 339.4 316.6 L 340.5 313.8 L 338.4 312.7 L 337.2 317.4 L 336.6 315 L 335.7 315.9 L 335.6 321 L 335.2 319.1 L 334.8 321.4 L 334.9 319.1 L 333 318.8 L 333.5 321.6 L 332.5 321.9 L 331.2 314.9 L 332 311.4 L 329.1 310.1 L 331.7 312.2 L 325.9 319.5 L 315.2 322.3 L 312.5 325.9 L 311.2 329.5 L 313.4 335.1 L 311.8 335.9 L 313.8 336 L 313.3 337.3 L 314.9 336.8 L 309.8 340.1 L 309.4 342.4 L 310.6 342.9 L 308.9 344.4 L 310.8 343.5 L 306.6 346.3 L 305.2 349.6 L 303.5 349.8 L 304.4 350.4 L 291.9 354.9 L 292.7 354.8 L 284.4 360.3 L 270.7 379.3 L 262.1 384.2 L 257 391.8 L 247.8 397.1 L 243.3 401.4 L 242.5 404.2 L 244.1 405.1 L 243.7 402.2 L 244.3 403.6 L 243.9 406.6 L 242.8 407.1 L 244.3 406.8 L 243.4 409 L 242.6 407.4 L 243.3 409.7 L 234.5 414 L 234.5 413 L 234.4 414 L 232 412.9 L 227.7 414.3 L 226 419.8 L 222.8 424.3 L 221.2 424.5 L 220.8 422 L 218.9 421.2 L 212.7 425 L 209.4 435.2 L 211.5 443.4 L 210.8 444 L 211.6 443.8 L 210.6 452.5 L 213.9 465.9 L 211 479.8 L 206.8 487 L 205.1 493.2 L 206.2 498.5 L 205.1 498.2 L 206.3 498.6 L 206.6 501.3 L 206.9 516.2 L 205.6 516.8 L 203.3 515.3 L 198.1 517.1 L 197.7 520.8 L 192.2 530.1 L 193.1 532.5 L 196.5 533.5 L 191.6 534 L 182.7 537.9 L 180.6 542.2 L 181.7 541.8 L 179.7 548.7 L 171.9 553.8 L 168.4 552.9 L 163.8 549.1 L 156.8 539.9 L 158.6 538.3 L 156.7 539.3 L 156.1 535.4 L 154 532.1 L 152.7 520.9 L 152.3 521.9 L 148 507.7 L 147.3 508.2 L 146.7 502.5 L 141.8 492.6 L 136.6 487.6 L 131 473.4 L 129 464.8 L 128.6 459.9 L 129.4 459.8 L 128.4 459.4 L 125 448.9 L 126.4 449.5 L 124.9 448.8 L 122.9 441.5 L 120.4 440.4 L 121.1 438.9 L 117.3 435.1 L 117.1 430.9 L 115.4 429.5 L 116.9 429.2 L 114.6 426.4 L 115.4 425.3 L 114.6 426 L 110.4 418.4 L 110 412.9 L 109.1 412.8 L 110.6 412.2 L 109.1 412.5 L 108.3 410.5 L 108.6 409.6 L 109 411.1 L 110.2 410.7 L 108.4 409 L 109.6 408.7 L 108.6 408.6 L 108.2 406.7 L 108.5 402.6 L 107.4 401.2 L 108.5 401.3 L 106.5 396.9 L 108.1 397 L 106.2 395.1 L 105.7 392.4 L 106.8 391.8 L 105.7 391.4 L 105.5 387.5 L 104.1 385.5 L 104.9 384.8 L 103.9 384.8 L 102.6 380.9 L 103.1 379.8 L 105.1 382.2 L 104.9 379.1 L 104 380.1 L 102.4 378.6 L 102.2 375.2 L 103.7 376.5 L 101.4 372.5 L 102.7 370.2 L 103.8 372.2 L 103.4 369.5 L 102.2 369 L 104.6 366.8 L 103.6 367.1 L 103.4 363.9 L 103 366.5 L 100.7 369 L 101 364 L 100.3 364.5 L 101.2 362.7 L 100.3 363.8 L 100.4 361.8 L 102.3 362.1 L 100.2 361.1 L 99.7 359.1 L 101.9 358 L 99.5 357.9 L 98.4 352.5 L 98.6 350.8 L 99.8 350.6 L 99.9 344.5 L 102.1 340.2 L 101.3 336.4 L 102.5 336.2 L 101 335.5 L 100.3 333.3 L 101.3 332.4 L 100 333.2 L 99.6 331.9 L 99.5 330.9 L 101.3 331.3 L 99.2 330.3 L 100.4 328.7 L 98.2 330.5 L 98.1 328.2 L 99.7 328.4 L 97.5 326.6 L 99.1 323.7 L 100 323.9 L 98.3 324 L 98.8 323 L 102.5 319.9 L 96.6 320.1 L 97.9 315.8 L 99.8 314.6 L 96.6 315.9 L 96.2 314.5 L 97.4 310.4 L 100 311 L 102.3 309.3 L 99.8 309.9 L 96.6 308.6 L 95 310.4 L 94.3 308 L 93.5 308.6 L 93.1 312.2 L 91.3 313.7 L 92.3 315.4 L 91 314.8 L 92.3 315.7 L 92.3 317.5 L 91.1 317.5 L 93.2 320.7 L 89.9 326.3 L 90.2 328.4 L 80.2 334.2 L 70.9 337.4 L 60.9 330.9 L 42.5 308.6 L 44.5 305.5 L 44 307.1 L 46.4 306.6 L 45.9 308.5 L 46.9 309.5 L 50.7 308.1 L 51.2 306.5 L 52.1 308.3 L 53.5 308.3 L 54.5 305.6 L 55.7 307 L 58.3 304.3 L 61.1 304.4 L 65.3 296.7 L 62.8 297.1 L 61.8 295.1 L 61.9 297 L 60.5 296.2 L 60 297.8 L 56.8 297.7 L 54.2 300.9 L 50.3 300.2 L 48.9 298.3 L 48.8 299.4 L 46.5 299.1 L 38 293.1 L 39.3 293.9 L 37.2 292 L 38.7 290.7 L 35.2 287.5 L 35.5 286.2 L 34.9 287 L 36.7 283.2 L 40.7 280.3 L 36.2 282.7 L 35 282.8 L 34.9 281.3 L 33.8 285.6 L 31.1 285 L 33.7 283 L 32.2 284 L 31.3 283 L 33.9 278.5 L 39.8 278.6 L 40.6 272.4 L 41.5 274.2 L 42.7 272.6 L 43.6 274 L 52.4 272.8 L 54.5 275 L 58.9 275 L 60.2 272.7 L 67 270.4 L 67.1 273.5 L 69.3 274.1 L 75.3 270.8 L 73.5 270 L 73.3 267.2 L 75 265.5 L 71.9 257.1 L 68.5 252.6 L 68.4 247 L 62.6 246.8 L 60 242.6 L 61.1 231.3 L 55.9 230.6 L 51.2 227.7 L 52.3 219.6 L 58.9 212.5 L 60.5 207.9 L 64.1 204.1 L 67.4 204.1 L 69.6 209.1 L 71.6 209.8 L 87 205 L 87.5 202 L 91.7 196.9 L 94.4 189.8 L 102.8 184.9 L 107.8 174.5 L 109.5 167.4 L 115.7 165.1 L 118.2 162.6 L 116.8 159.5 L 118.2 157.9 L 117.6 157 L 119.7 156.3 L 124.9 148.3 L 129.1 145.7 L 126.3 144.6 L 126.9 140.1 L 128.4 138.9 L 125.9 133.3 L 127.7 129.8 L 130.9 128.5 L 131.8 126.6 L 137.2 125.9 L 139.2 123.3 L 138.5 121 L 135.1 118.3 L 128.8 118 L 128.2 115.6 L 129.2 111.2 L 128.2 113 L 124.2 112.6 L 117.5 107.4 L 113.1 106.2 L 112.5 90.3 L 109.6 80.6 L 110.4 76.7 L 113.4 76.9 L 114.5 72.8 L 119.3 70.3 L 120.6 65.6 L 114.8 63.6 L 114 61 L 115.4 57.4 L 109.7 57.3 L 108.6 54.6 L 105.5 53.4 L 106.3 50.6 L 97.1 50.7 L 96.2 49.7 L 96.8 42.9 L 103.1 37.9 L 104.5 33.3 L 116.5 32.8 L 113.6 28.7 L 119.2 30.5 L 125 26.9 L 127.1 27.7 L 128.9 25.1 L 131.2 25.7 L 132.1 28.3 L 135.8 26.4 L 139.9 27.9 L 140.5 32.7 L 144.7 32.2 L 147.7 35.2 L 149.1 38.7 L 159.4 44.4 L 161.2 50.6 L 168.9 53.4 L 170.7 54.8 L 171.4 58.2 Z M 404.7 461.4 L 404.2 463.4 L 405.4 465.1 L 403.4 464.9 L 405 466.2 L 404.5 469.7 L 403.5 470.6 L 402.4 469.2 L 403.1 471.3 L 401.1 472.5 L 401.7 463.9 L 402.9 461.6 L 404.7 461.4 Z M 399.6 483.8 L 400.4 484.7 L 399.6 486.8 L 400.9 486.8 L 399.8 489 L 400.9 489.4 L 400.4 492.8 L 399 493.6 L 400.4 493.4 L 399.7 496.6 L 396.7 490.3 L 397.5 488.7 L 398.1 490.3 L 399.6 483.8 Z M 402.6 472.2 L 403.6 479.4 L 402.8 480.8 L 401.1 479.9 L 402.4 482.2 L 400.1 482.6 L 399.3 477.3 L 400.9 475.8 L 400.1 476.3 L 399.9 473.7 L 402.6 472.2 Z M 416.6 567.6 L 418.4 571.7 L 416.6 575.8 L 413.8 569.6 L 416.6 567.6 Z M 415 564.6 L 415.6 565.6 L 413.9 567.6 L 413.7 565.5 L 415 564.6 Z M 409.6 554.6 L 410.8 557.2 L 408.7 556.3 L 409.6 554.6 Z";

const DESTINATIONS: CircuitDestination[] = [
  {
    id: 'kashmir',
    name: 'Kashmir & Valley of Bliss',
    tagline: 'Srinagar • Gulmarg • Pahalgam • Sonmarg',
    category: 'himalayas',
    categoryLabel: 'Himalayan Escape',
    departureHubs: ['All', 'Delhi', 'Mumbai'],
    x: 131,
    y: 87,
    duration: '5 Days / 4 Nights',
    price: 28500,
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
    circuitCities: ['Srinagar', 'Gulmarg Gondola', 'Pahalgam Valley', 'Dal Lake Houseboat'],
    highlights: [
      'Private Shikara ride at golden hour on Dal Lake',
      'Phase 1 & 2 Gondola cable car ride in Gulmarg',
      'Scenic Betaab Valley & Aru Valley excursion in Pahalgam',
      'Luxury heritage pine wood houseboat stay with heating'
    ],
    bestSeason: 'Year-Round (Snow in Dec-Feb, Blooms in Apr-Aug)'
  },
  {
    id: 'himachal',
    name: 'Himachal Highland Trail',
    tagline: 'Shimla • Manali • Solang Valley • Atal Tunnel',
    category: 'himalayas',
    categoryLabel: 'Himalayan Escape',
    departureHubs: ['All', 'Delhi'],
    x: 166,
    y: 132,
    duration: '6 Days / 5 Nights',
    price: 24999,
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    circuitCities: ['Shimla Mall Road', 'Kufri', 'Manali', 'Solang Valley', 'Sissu'],
    highlights: [
      'Drive through the engineering marvel of Atal Tunnel to Lahaul',
      'Paragliding and snow quad biking at Solang Valley',
      'Strolls across British-era colonial ridge and Mall Road',
      'Hot springs bath and Tibetan monastery visits'
    ],
    bestSeason: 'Sep to June'
  },
  {
    id: 'varanasi-ayodhya',
    name: 'Divine Spiritual Circuit',
    tagline: 'Varanasi • Prayagraj • Ayodhya • Chitrakoot',
    category: 'spiritual',
    categoryLabel: 'Spiritual Trail',
    departureHubs: ['All', 'Mumbai', 'Pune', 'Delhi'],
    x: 253,
    y: 254,
    duration: '4 Days / 3 Nights',
    price: 46999,
    packageId: '5d4b8f01-7bfd-4483-9c02-ec825200bd0e',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    circuitCities: ['Varanasi Ghats', 'Kashi Vishwanath', 'Ayodhya Ram Mandir', 'Prayagraj Triveni Sangam'],
    highlights: [
      'VIP Darshan access at newly consecrated Shri Ram Janmabhoomi Mandir',
      'Evening Ganga Aarti from private reserved boat on Dashashwamedh Ghat',
      'Holy dip and boat ride at Triveni Sangam in Prayagraj',
      'Chauffeured private AC luxury vehicle with verified tour chaperone'
    ],
    bestSeason: 'Oct to March'
  },
  {
    id: 'rajasthan',
    name: 'Royal Rajputana Heritage',
    tagline: 'Jaipur • Jodhpur • Udaipur • Pushkar',
    category: 'royal',
    categoryLabel: 'Royal Heritage',
    departureHubs: ['All', 'Delhi', 'Mumbai'],
    x: 122,
    y: 232,
    duration: '6 Days / 5 Nights',
    price: 54129,
    packageId: '06d9ab59-580a-4fca-b7e8-922f2c254e37',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
    circuitCities: ['Jaipur Pink City', 'Amer Fort', 'Udaipur City Palace', 'Lake Pichola'],
    highlights: [
      'Sunset boat cruise along Lake Pichola overlooking Jag Mandir',
      'Private guided walkthrough of Amer Fort and Hawa Mahal',
      'Authentic candlelit Rajasthani thali dining experience',
      'Boutique heritage Haveli hotel accommodation'
    ],
    bestSeason: 'Oct to March'
  },
  {
    id: 'maharashtra-jyotirlinga',
    name: 'Maharashtra Sacred Jyotirlinga & Shirdi',
    tagline: 'Trimbakeshwar • Bhimashankar • Grishneshwar • Shirdi',
    category: 'spiritual',
    categoryLabel: 'Spiritual Trail',
    departureHubs: ['All', 'Mumbai', 'Pune'],
    x: 126,
    y: 353,
    duration: '5 Days / 4 Nights',
    price: 38500,
    packageId: '7e3e7fe1-4629-41a3-b8a7-3cf7c2f035fa',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80',
    circuitCities: ['Pune', 'Bhimashankar', 'Shirdi Sai Temple', 'Trimbakeshwar Nashik'],
    highlights: [
      'Darshan at 3 holy Jyotirlinga shrines of Maharashtra',
      'VIP Kakad Aarti booking assistance at Shirdi Sai Sansthan',
      'Smooth door-to-door luxury cab pickup from Mumbai or Pune',
      'Scenic Western Ghats mountain views along the journey'
    ],
    bestSeason: 'July to Feb'
  },
  {
    id: 'mahabaleshwar',
    name: 'Mahabaleshwar & Panchgani Retreat',
    tagline: 'Strawberry Farms • Arthur Seat • Venna Lake',
    category: 'weekend',
    categoryLabel: 'Weekend Getaway',
    departureHubs: ['All', 'Mumbai', 'Pune'],
    x: 114,
    y: 386,
    duration: '3 Days / 2 Nights',
    price: 23998,
    packageId: '0e45521f-dc26-454c-a52f-62ca9ff83f46',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    circuitCities: ['Panchgani Tableland', 'Mahabaleshwar Market', 'Venna Lake', 'Pratapgad Fort'],
    highlights: [
      'Chauffeured road trip from Mumbai/Pune in premium sedan/SUV',
      'Fresh organic strawberry picking tour at Mapro Gardens',
      'Sunset boating on misty Venna Lake',
      'Luxury valley-view resort stay with private balcony'
    ],
    bestSeason: 'Year-Round (Misty Monsoon & Cool Winters)'
  },
  {
    id: 'goa',
    name: 'Goa Coastal Serenity & Catamaran',
    tagline: 'North Goa Sunset • South Goa Heritage • Mandovi Cruise',
    category: 'coastal',
    categoryLabel: 'Beach & Coastal',
    departureHubs: ['All', 'Mumbai', 'Pune'],
    x: 119,
    y: 431,
    duration: '4 Days / 3 Nights',
    price: 18500,
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    circuitCities: ['Panaji Latin Quarter', 'Calangute Beach', 'Old Goa Basilica', 'Palolem Beach'],
    highlights: [
      'Private sunset catamaran sailing on the Arabian Sea',
      'Heritage Portuguese mansion walk in Fontainhas, Panaji',
      'Beachside cabana dining with fresh coastal seafood',
      'Airport / Madgaon station pickup in sanitized private cab'
    ],
    bestSeason: 'Oct to May'
  },
  {
    id: 'kerala',
    name: 'Kerala Backwaters & Tea Gardens',
    tagline: 'Munnar • Thekkady • Alleppey Houseboat',
    category: 'coastal',
    categoryLabel: 'Beach & Backwaters',
    departureHubs: ['All', 'Mumbai', 'Delhi'],
    x: 154,
    y: 524,
    duration: '6 Days / 5 Nights',
    price: 26450,
    packageId: '9ad55b7a-1664-4c30-9940-838e7e433afb',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
    circuitCities: ['Kochi Fort', 'Munnar Tea Hills', 'Thekkady Spice Garden', 'Alleppey Backwaters'],
    highlights: [
      'Exclusive overnight private houseboat cruise with personal chef',
      'Panoramic tea plantation trekking and waterfalls in Munnar',
      'Periyar tiger reserve boat safari & Kathakali cultural show',
      'Ayurvedic rejuvenating herbal massage session'
    ],
    bestSeason: 'Sep to April'
  },
  {
    id: 'sikkim',
    name: 'Himalayan Bliss – Sikkim & Darjeeling',
    tagline: 'Gangtok • Tsomgo Lake • Darjeeling Toy Train',
    category: 'himalayas',
    categoryLabel: 'Himalayan Escape',
    departureHubs: ['All', 'Delhi', 'Mumbai'],
    x: 338,
    y: 217,
    duration: '5 Days / 4 Nights',
    price: 97031,
    packageId: '9d33e237-1d0d-4c15-a614-07199a15745d',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
    circuitCities: ['Gangtok MG Marg', 'Tsomgo Glacial Lake', 'Tiger Hill Sunrise', 'Darjeeling Toy Train'],
    highlights: [
      'Sunrise view of Mount Kanchenjunga from Tiger Hill',
      'Excursion to high-altitude frozen Tsomgo Lake and Baba Mandir',
      'UNESCO World Heritage Darjeeling Himalayan Toy Train ride',
      'Fresh Orthodox tea tasting in lush Makaibari tea estate'
    ],
    bestSeason: 'March to June, Oct to Dec'
  }
];

export const InteractiveIndiaExplorer: React.FC<{
  onOpenConcierge?: () => void;
}> = ({ onOpenConcierge }) => {
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [selectedDeparture, setSelectedDeparture] = useState<string>('All');
  const [activeDestinationId, setActiveDestinationId] = useState<string>('varanasi-ayodhya');
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  // Filter destinations based on selected mood and departure hub
  const filteredDestinations = useMemo(() => {
    return DESTINATIONS.filter(d => {
      const matchesMood = selectedMood === 'all' || d.category === selectedMood;
      const matchesDept = selectedDeparture === 'All' || d.departureHubs.includes(selectedDeparture) || d.departureHubs.includes('All');
      return matchesMood && matchesDept;
    });
  }, [selectedMood, selectedDeparture]);

  // Current active spotlight destination
  const activeDest = useMemo(() => {
    return DESTINATIONS.find(d => d.id === activeDestinationId) || filteredDestinations[0] || DESTINATIONS[0];
  }, [activeDestinationId, filteredDestinations]);

  // Generate WhatsApp inquiry link with pre-filled message
  const getWhatsAppLink = (dest: CircuitDestination) => {
    const text = `Hi Shrawello Concierge! I am interested in the ${dest.name} (${dest.duration}, approx ${formatPrice(dest.price)}) tour package shown on my customer portal. Please share available dates and customized quote!`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EDE8DF] p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in duration-300">
      
      {/* ── Section Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EDE8DF]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#C9732A] bg-[#C9732A]/10 px-3 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">travel_explore</span>
              Interactive Circuit Explorer
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full hidden sm:inline-block">
              Curated by Shrawello Experts
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight">
            Explore India's Premier Holiday Circuits
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Tap any destination on the map to view curated multi-city routes, transparent pricing, and instant itinerary options with zero booking friction.
          </p>
        </div>

        {/* Departure City Selector */}
        <div className="flex items-center gap-2 bg-[#F9F7F2] p-1.5 rounded-2xl border border-[#EDE8DF] self-start lg:self-auto">
          <span className="text-[10px] font-bold uppercase text-slate-400 pl-2">Departing:</span>
          {['All', 'Mumbai', 'Pune', 'Delhi'].map(city => (
            <button
              key={city}
              onClick={() => setSelectedDeparture(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDeparture === city
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mood & Theme Filter Pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: '🌟 All Circuits' },
          { key: 'spiritual', label: '🕉️ Spiritual Trails' },
          { key: 'himalayas', label: '🏔️ Himalayan Escapes' },
          { key: 'coastal', label: '🏖️ Beach & Backwaters' },
          { key: 'royal', label: '🏰 Royal Heritage' },
          { key: 'weekend', label: '🚗 Weekend Road Trips' },
        ].map(pill => (
          <button
            key={pill.key}
            onClick={() => {
              setSelectedMood(pill.key);
              // Pick first destination in this category if active is not in it
              const firstInMood = DESTINATIONS.find(d => pill.key === 'all' || d.category === pill.key);
              if (firstInMood) setActiveDestinationId(firstInMood.id);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedMood === pill.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-[#F9F7F2] text-slate-600 hover:bg-[#EDE8DF] border border-[#EDE8DF]'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* ── Main Dual-View: Map + Circuit Spotlight ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT: Interactive SVG Map of India (lg:col-span-6) ── */}
        <div className="lg:col-span-6 bg-[#FDFBF7] rounded-3xl p-4 sm:p-6 border border-[#EDE8DF] relative flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px] shadow-inner select-none overflow-hidden">
          
          {/* Subtle Ambient Map Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#2D6A4F 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />

          {/* Map Title watermark */}
          <div className="absolute top-4 left-4 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
            Official Boundary of India • Curated Corridors
          </div>

          <div className="w-full max-w-[420px] relative aspect-[500/580]">
            <svg
              viewBox="0 0 500 580"
              className="w-full h-full drop-shadow-sm"
              style={{ overflow: 'visible' }}
            >
              {/* Stylized Vector Silhouette of India */}
              <path
                d={INDIA_ACCURATE_PATH}
                fill="#F4EFEA"
                stroke="#D8CFBF"
                strokeWidth="1.8"
                strokeLinejoin="round"
                className="transition-colors duration-500 hover:fill-[#EEE6DC]"
              />

              {/* Connecting Circuit Routes (Calibrated dotted trails across Indian states) */}
              <g stroke="#C9732A" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6">
                {/* Spiritual Corridor: Rajasthan <-> Varanasi/Ayodhya */}
                <path d="M 253 254 Q 185 240 122 232" className="animate-pulse" />
                {/* Northern Himalayan Trail: Kashmir <-> Himachal */}
                <path d="M 131 87 Q 148 108 166 132" />
                {/* Himalayan Corridor: Himachal <-> Sikkim */}
                <path d="M 166 132 Q 250 170 338 217" />
                {/* Maharashtra Jyotirlinga <-> Mahabaleshwar Retreat */}
                <path d="M 126 353 Q 120 370 114 386" />
                {/* Western Ghats <-> Goa Coast */}
                <path d="M 114 386 Q 116 408 119 431" />
                {/* Southern Malabar Trail: Goa <-> Kerala Backwaters */}
                <path d="M 119 431 Q 135 480 154 524" />
              </g>

              {/* Interactive Destination Pulse Pins */}
              {DESTINATIONS.map(dest => {
                const isSelected = dest.id === activeDest.id;
                const isFiltered = filteredDestinations.some(fd => fd.id === dest.id);
                const isHovered = hoveredPin === dest.id;

                return (
                  <g
                    key={dest.id}
                    className="cursor-pointer transition-transform duration-300"
                    onClick={() => setActiveDestinationId(dest.id)}
                    onMouseEnter={() => setHoveredPin(dest.id)}
                    onMouseLeave={() => setHoveredPin(null)}
                    opacity={isFiltered ? 1 : 0.25}
                  >
                    {/* Pulsing beacon wave when selected */}
                    {isSelected && (
                      <circle
                        cx={dest.x}
                        cy={dest.y}
                        r="18"
                        fill="#C9732A"
                        opacity="0.25"
                        className="animate-ping"
                      />
                    )}

                    {/* Outer Pin Halo */}
                    <circle
                      cx={dest.x}
                      cy={dest.y}
                      r={isSelected ? 10 : isHovered ? 8 : 6}
                      fill={isSelected ? '#C9732A' : '#2D6A4F'}
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      className="transition-all duration-300 drop-shadow-md"
                    />

                    {/* Pin Center Glow */}
                    <circle
                      cx={dest.x}
                      cy={dest.y}
                      r={isSelected ? 4 : 2.5}
                      fill="#FFFFFF"
                    />

                    {/* Floating City Pill Label on Map */}
                    <g transform={`translate(${dest.x + 12}, ${dest.y + 4})`}>
                      <rect
                        rx="4"
                        ry="4"
                        x="-2"
                        y="-10"
                        width={dest.name.split(' ')[0].length * 7 + 14}
                        height="16"
                        fill={isSelected ? '#1E293B' : 'rgba(255,255,255,0.92)'}
                        stroke={isSelected ? '#C9732A' : '#E2D9CC'}
                        strokeWidth="1"
                        className="drop-shadow-xs"
                      />
                      <text
                        x="5"
                        y="2"
                        fontSize="9"
                        fontWeight="800"
                        fill={isSelected ? '#FFFFFF' : '#334155'}
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {dest.name.split(' ')[0]}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[11px] text-slate-400 mt-2 text-center">
            Click on any pin to inspect the multi-city circuit details
          </div>
        </div>

        {/* ── RIGHT: Selected Circuit Spotlight Card (lg:col-span-6) ── */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#FDFBF7] rounded-3xl border border-[#EDE8DF] overflow-hidden shadow-xs flex flex-col justify-between">
            
            {/* Destination Cover Photo & Top Badges */}
            <div className="h-52 relative overflow-hidden bg-slate-900 group">
              <img
                src={activeDest.image}
                alt={activeDest.name}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src !== DEFAULT_FALLBACK_IMG) {
                    el.src = DEFAULT_FALLBACK_IMG;
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

              {/* Badges on image */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="bg-[#C9732A] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  {activeDest.categoryLabel}
                </span>
                <span className="bg-white/95 backdrop-blur-md text-slate-800 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                  {activeDest.duration}
                </span>
              </div>

              {/* Title & Tagline overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl sm:text-2xl font-display font-black text-white drop-shadow-md">
                  {activeDest.name}
                </h3>
                <p className="text-xs text-white/80 font-medium mt-0.5">
                  {activeDest.tagline}
                </p>
              </div>
            </div>

            {/* Circuit Content & Highlights */}
            <div className="p-6 space-y-5">
              
              {/* Pricing & Seasonality strip */}
              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#EDE8DF]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Starting From</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-[#2D6A4F]">{formatPrice(activeDest.price)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">/ person</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Optimal Season</span>
                  <span className="text-xs font-bold text-slate-700">{activeDest.bestSeason.split('(')[0]}</span>
                </div>
              </div>

              {/* Connected Route Cities */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#C9732A]">route</span>
                  Curated Travel Route
                </h4>
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeDest.circuitCities.map((city, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-3 py-1 bg-white text-slate-800 text-xs font-bold rounded-lg border border-[#EDE8DF] shadow-2xs">
                        {city}
                      </span>
                      {idx < activeDest.circuitCities.length - 1 && (
                        <span className="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Key Inclusions & Highlights */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Trip Inclusions & Experiences
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  {activeDest.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                      <span className="leading-snug">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Frictionless Conversion Actions */}
              <div className="pt-3 border-t border-[#EDE8DF] flex flex-col sm:flex-row gap-2.5">
                {/* 1-Tap WhatsApp Inquiry */}
                <a
                  href={getWhatsAppLink(activeDest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Inquire on WhatsApp</span>
                </a>

                {/* View Full Package details */}
                <Link
                  to={activeDest.packageId ? `/packages/${activeDest.packageId}` : `/packages?search=${encodeURIComponent(activeDest.name)}`}
                  className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <span>View Itinerary</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>

                {/* Custom Itinerary Quote */}
                <button
                  onClick={onOpenConcierge}
                  className="py-3 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#EDE8DF] rounded-xl text-xs font-bold transition-all flex items-center justify-center"
                  title="Plan Custom Departure"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* ── Mobile Horizontal Swipeable Carousel (visible on small screens) ── */}
      <div className="lg:hidden space-y-3 pt-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Swipe Featured Regional Circuits
        </h4>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {filteredDestinations.map(dest => (
            <div
              key={dest.id}
              onClick={() => setActiveDestinationId(dest.id)}
              className={`min-w-[260px] max-w-[260px] bg-[#FDFBF7] rounded-2xl border p-3.5 space-y-2.5 cursor-pointer transition-all ${
                activeDest.id === dest.id ? 'border-[#C9732A] shadow-md ring-2 ring-[#C9732A]/20' : 'border-[#EDE8DF]'
              }`}
            >
              <div className="h-28 rounded-xl overflow-hidden relative">
                <img
                  src={dest.image}
                  alt={dest.name}
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.src !== DEFAULT_FALLBACK_IMG) {
                      el.src = DEFAULT_FALLBACK_IMG;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                  {dest.duration}
                </span>
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-900 line-clamp-1">{dest.name}</h5>
                <span className="text-[10px] text-[#2D6A4F] font-black">{formatPrice(dest.price)} per person</span>
              </div>
              <a
                href={getWhatsAppLink(dest)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">chat</span>
                WhatsApp Deal
              </a>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

