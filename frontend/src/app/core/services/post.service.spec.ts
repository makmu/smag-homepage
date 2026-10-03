import { environment } from '../../../environments/environment';
import { toRelativeThumbnailUrl } from './post.service';

describe('toRelativeThumbnailUrl', () => {
    it('strips the api prefix from an absolute thumbnail url', () => {
        expect(toRelativeThumbnailUrl(environment.apiUrl + '/media/7')).toBe('/media/7');
    });

    it('strips the api prefix from a relative thumbnail url', () => {
        expect(toRelativeThumbnailUrl('/api/v1/media/7')).toBe('/media/7');
    });

    it('keeps an already relative media url unchanged', () => {
        expect(toRelativeThumbnailUrl('/media/7')).toBe('/media/7');
    });

    it('recovers the relative form from a foreign absolute host', () => {
        expect(toRelativeThumbnailUrl('http://other-host.example/api/v1/media/7')).toBe('/media/7');
    });

    it('returns urls without a media path unchanged', () => {
        expect(toRelativeThumbnailUrl('https://cdn.example.com/pic.png')).toBe(
            'https://cdn.example.com/pic.png'
        );
    });
});
