-- Data migration: Add new songs
INSERT INTO "MusicQuizSong" ("title", "aliases", "artists", "playlist", "opusUrl", "songUrl", "thumbUrl", "duration", "updatedAt")
VALUES 
('Come On', ARRAY['come on'], 'Dimitri Vegas,Like Mike, NMIXX', 'Collab', 'collab/come-on/song.opus', 'https://youtu.be/mCn9VtIYcrw?si=nfK1RZYxA7dTXBad', 'collab/come-on/thumbnail.jpg', 146, CURRENT_TIMESTAMP),
('Like Magic', ARRAY['like magic'], 'J.Y. Park, Stray Kids, ITZY, NMIXX', 'Collab', 'collab/like-magic/song.opus', 'https://youtu.be/t6bBDAlpQZs?si=4pKaZeH_GCg4q9uY', 'collab/like-magic/thumbnail.jpg', 185, CURRENT_TIMESTAMP),
('MEXE', ARRAY['mexe'], 'Pabllo Vittar, NMIXX', 'Collab', 'collab/mexe/song.opus', 'https://youtu.be/0zgJgsbcAN8?si=-m2O7y43z30-HKGy', 'collab/mexe/thumbnail.jpg', 146, CURRENT_TIMESTAMP),
('TIC TIC', ARRAY['tic tic'], 'Pabllo Vittar, NMIXX', 'Collab', 'collab/tic-tic/song.opus', 'https://youtu.be/aDjQMDZFNiM?si=3b7lcbfUAX8d-ua4', 'collab/tic-tic/thumbnail.jpg', 133, CURRENT_TIMESTAMP),
('54321', ARRAY['54321'], 'pH-1, Haewon', 'Collab', 'collab/54321/song.opus', 'https://youtu.be/9mUI9T5ku3Y?si=HkE24MtikLkdPNu5', 'collab/54321/thumbnail.jpg', 185, CURRENT_TIMESTAMP),
('蜚蜚 (FEIFEI)', ARRAY['feifei'], 'NMIXX', 'Cover', 'cover/feifei/song.opus', 'https://youtu.be/zrYC3LEpc6w?si=mJ-ZiVw8Y5hyc8Od', 'cover/feifei/thumbnail.jpg', 212, CURRENT_TIMESTAMP),
('Kiss', ARRAY['kiss'], 'NMIXX', 'Cover', 'cover/kiss/song.opus', 'https://youtu.be/oiSmwzPZOOo?si=uVeiIeKlPIe-JZGq', 'cover/kiss/thumbnail.jpg', 186, CURRENT_TIMESTAMP)
ON CONFLICT ("opusUrl") DO NOTHING;
