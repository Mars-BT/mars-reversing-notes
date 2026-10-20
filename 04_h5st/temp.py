url = 'https://api.m.jd.com/api?appid=search-pc-java&t=1792465588782&client=pc&clientVersion=1.0.0&cthr=1&uuid=1789523885546496708122&loginType=3&keyword=%E5%86%B0%E7%AE%B1&ev=25359_3726&functionId=pc_search_searchWare&body={"enc":"utf-8","pvid":"ea8a29378d0b4b1e89f2430b79665d1c","area":"19_1607_47388_62139","page":1,"mode":"","concise":false,"hoverPictures":true,"newAdvRepeat":true,"mixerParam":true,"new_interval":true,"s":1,"pageSize":30}&x-api-eid-token=jdd03IA3TWHCSGYYBFRIRDEBXZZNB7NX7PUH7FU3LLWZTZAOZC7BQYOQHOVOJEXLOZAFMDHLXW4VFUYFK3MVOKIUB6QDLKYAAAANBK4SA3GIAAAAADWKGFXZK6HGS3AX&h5st=20261020110631785;nbyjnjyy1m7inje3;f06cc;tk03w87201b9f18nrz4t3iBQDALnGyKrJD-XR7zBbU8ZPQAGL8wX5d6_jR7kz9gW9t4g9WT5MtRcKRGT0vXfowRiUccF;7206aa3d2a7af8ef9f125941c37d1b19b38f7f9bf72ea7a1751c9e7f7179199f;5.3;1792465588785;q3EpJfYSByVR03VfyGER9CVNJyFjLDIj7SFjLrJp-fod0Lod2XIe3jYd0nojxjpOJrpjh7JjV6Xa3iGR3KUb3ipjxjpe6XETJrpjh7pf6rJdJz1TIipjLDrgJXleHiYfImIfGW1TJW1T7P4e2HISJS4T6flfzb1eGqYTJrJdJrEa-OFTGOEjLrJp-jpfJW1e3LodGe1e0f1TFO4e6T1Tznle1XYSFmIfIOISKipjxj5PKSEQKeFjLrJp-jZf_jpjxjpe2iFjLrJp-jJe9fIg2T0UG6VRFuWeDipjxjJOJrpjh7JjyCFO0Dnd-C1fcO2YJrJdJ31QHyVT5ipjLDrgJ7VS3yVZImVYJrJdJTlPJrpjh7ZMLrJp6rJdJXYf2iFjLrpjLDrgJbIa-LXbJrJdJfYf2iFjLrpjLDrg4rJdJnYf2iFjLrpjLDrg0nojxjpf6XETJrpjLrJp-LYgLDIj5nYOJipjLrpjh7Jj8a4f_a4fZSERJrJdJ31QHyVT5ipjLrpjh7pfLDIjzXETJrpjLrJp-rojxj5e2iFjLrpjLDrg7jojxjJe2iFjLrpjLDrg7rJdJXYOJipjLrpjh7pfLDIj3XETJrpjLrJp-fYf6rJdJfYOJipjLrpjh7Jj1zZf9rIjLDIj6XETJrpjLrJp-rojxj5R0ipjLrpjh7ZeLDIj46FjLrpjLDrg7rJdJ7FjLrpjLDrg7rJdJb1OJrpjLrJpwqJdJbFQGakNGipjLDrguqpjhjZf1PIe6nYg3rof7bYe1jIfJrJdJjoPJrpjLrJpwqJdJrkPJrpjh7Jj0vWe6vmf6rpVLf2YLfVTeqpQGaEQiq5dDe0Q3yVRImVYJrJdJnVO4ipjLD7N;6d8cb5ef524f28ae92b865808be807b6612f19c6a9affe33f4539e33ae7ad1c3;qbkgHGHQ8GlOIyVOF6JQ8G1P5WFW3yVSC61T-bEQGGlQI6ZNHuFT-bVR7qUT'


import urllib.parse
import json

SEP = "=" * 64


def parse_request_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    param_map = dict(params)

    print(SEP)
    print("【基础信息】")
    print(SEP)
    print(f"scheme : {parsed.scheme}")
    print(f"host   : {parsed.netloc}")
    print(f"path   : {parsed.path}")

    print()
    print(SEP)
    print(f"【Query 参数】共 {len(params)} 个")
    print(SEP)
    width = max(len(k) for k, _ in params)
    for k, v in params:
        if k == "body":
            continue
        if k == "keyword":
            print(f"{k:<{width}} = {v}   (urlencoded: {urllib.parse.quote(v)})")
        else:
            print(f"{k:<{width}} = {v}")

    body = param_map.get("body")
    print()
    print(SEP)
    print("【body 字段】")
    print(SEP)
    if body:
        try:
            body_obj = json.loads(body)
        except json.JSONDecodeError:
            print(body)
        else:
            bwidth = max(len(k) for k in body_obj)
            for k, v in body_obj.items():
                print(f"{k:<{bwidth}} = {json.dumps(v, ensure_ascii=False)}")

    h5st = param_map.get("h5st")
    print()
    print(SEP)
    print("【h5st 分段】")
    print(SEP)
    if h5st:
        for i, seg in enumerate(h5st.split(";"), 1):
            print(f"[{i}] {seg}")


if __name__ == "__main__":
    parse_request_url(url)