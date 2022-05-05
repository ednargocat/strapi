'use strict';

const fs = require('fs');
const path = require('path');

// Helpers.
const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const {
  createContentAPIRequest,
  createAuthRequest,
} = require('../../../../../test/helpers/request');

const builder = createTestBuilder();
const data = {
  dogs: [],
};
let strapi;
let rq;
let rqAdmin;
let uploadFolder;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    pic: {
      type: 'media',
    },
  },
};

describe('Uploads folder', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    // delete all folders
    const res = await rq({
      method: 'GET',
      url: '/upload/folders?pagination[pageSize]=100',
    });
    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: {
        folderIds: res.body.results.map(f => f.id),
      },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Regular upload', () => {
    test('Uploaded file goes into a specific folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'Uploads',
          parent: null,
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (1)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });
  });

  describe('Upload to an entity', () => {
    test('Uploaded file goes into a specific folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/dogs?populate=*',
        formData: {
          data: '{}',
          'files.pic': fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.attributes.pic.data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (1)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/dogs?populate=*',
        formData: {
          data: '{}',
          'files.pic': fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.attributes.pic.data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (1)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'Uploads (1)',
          parent: null,
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/dogs?populate=*',
        formData: {
          data: '{}',
          'files.pic': fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.attributes.pic.data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (2)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });
  });

  describe('Attach to an entity', () => {
    beforeAll(async () => {
      const res = await rq({
        method: 'POST',
        url: '/dogs',
        formData: {
          data: '{}',
        },
      });
      data.dogs.push(res.body.data);
    });

    test('Uploaded file goes into a specific folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          data: '{}',
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          refId: data.dogs[0].id,
          ref: 'api::dog.dog',
          field: 'pic',
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (2)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          data: '{}',
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          refId: data.dogs[0].id,
          ref: 'api::dog.dog',
          field: 'pic',
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (2)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'Uploads (2)',
          parent: null,
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          refId: data.dogs[0].id,
          ref: 'api::dog.dog',
          field: 'pic',
        },
      });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (3)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });
  });
});