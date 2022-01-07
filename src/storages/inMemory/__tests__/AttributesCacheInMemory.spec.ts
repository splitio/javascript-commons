import { AttributesCacheInMemory } from '../AttributesCacheInMemory';


describe('ATTRIBUTES CACHE', () => {

  test('ATTRIBUTES CACHE / Should ..', () => {

    const cache = new AttributesCacheInMemory();

    expect(cache.setAttribute('attributeName1', 'attributeValue1')).toEqual(true);
    expect(cache.setAttribute('attributeName2', 'attributeValue2')).toEqual(true);

    expect(cache.getAll()).toEqual({ attributeName1: 'attributeValue1', attributeName2: 'attributeValue2' });

    expect(cache.removeAttribute('attributeName1')).toEqual(true);

    expect(cache.getAttribute('attributeName1')).toEqual(undefined);
    expect(cache.getAttribute('attributeName2')).toEqual('attributeValue2');

    expect(cache.setAttributes({
      'attributeName3': 'attributeValue3',
      'attributeName4': 'attributeValue4'
    })).toEqual(true);

    expect(cache.getAttribute('attributeName2')).toEqual('attributeValue2');
    expect(cache.getAttribute('attributeName3')).toEqual('attributeValue3');
    expect(cache.getAttribute('attributeName4')).toEqual('attributeValue4');

    cache.clear();

    expect(cache.getAll()).toEqual({});

  });

});

