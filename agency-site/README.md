# Hlab.studio website

Portfolio website for Hlab.studio, published as a claude.ai artifact.

- `index.html`: the whole site. Routes by URL hash:
  - `#trang-chu`: home (hero, featured work, all work with filters, clients, studio, process, contact)
  - `#du-an-<id>`: one project page with a before/after compare slider
  - `#quan-tri`: content admin (CMS), shown only to people who can edit the artifact
- `data/projects.json`: projects (title, category, sub-category, images, story, order, published, featured)
- `data/site.json`: page content (hero, showreel, stats, clients, testimonials, studio, process, contact, font)

The CMS saves by publishing new versions of `data/*.json` and `media/*` files into the artifact.
Saving is unavailable while the artifact is shared publicly; switch sharing to private or organization to save.
