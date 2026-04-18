import type { SongComposition } from "../lib/types";
import { demoSong } from "./demoSong";
import { lostAnotherHourSong } from "./lostAnotherHour";

export const songCatalog: SongComposition[] = [lostAnotherHourSong, demoSong];

export const getSongById = (songId: string): SongComposition =>
  songCatalog.find((song) => song.songId === songId) ?? songCatalog[0];
