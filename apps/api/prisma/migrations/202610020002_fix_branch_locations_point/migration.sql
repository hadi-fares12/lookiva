ALTER TABLE "branch_locations"
  ALTER COLUMN "point" DROP NOT NULL;

ALTER TABLE "branch_locations"
  ALTER COLUMN "point" TYPE geometry(Point, 4326)
  USING NULL::geometry;